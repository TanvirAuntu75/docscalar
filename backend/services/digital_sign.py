import datetime
import tempfile
from pathlib import Path

from cryptography import x509
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives.serialization import pkcs12
from cryptography.x509.oid import NameOID
from pyhanko import stamp
from pyhanko.pdf_utils import images
from pyhanko.pdf_utils.incremental_writer import IncrementalPdfFileWriter
from pyhanko.sign import fields, signers

from backend import config
from backend.jobs.queue import update_job_progress
from backend.services.libreoffice import ConversionResult


def generate_self_signed_pfx(
    email: str = "security@docscalar.com", common_name: str = "DocScalar Trust Seal"
) -> bytes:
    """
    Generate an offline, self-signed X.509 certificate and private key in PKCS#12 format.
    """
    private_key = rsa.generate_private_key(
        public_exponent=65537,
        key_size=2048,
    )

    subject = issuer = x509.Name(
        [
            x509.NameAttribute(NameOID.COMMON_NAME, common_name),
            x509.NameAttribute(NameOID.EMAIL_ADDRESS, email),
            x509.NameAttribute(NameOID.ORGANIZATION_NAME, "DocScalar Privacy First LLC"),
            x509.NameAttribute(NameOID.COUNTRY_NAME, "US"),
        ]
    )

    cert = (
        x509.CertificateBuilder()
        .subject_name(subject)
        .issuer_name(issuer)
        .public_key(private_key.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(
            datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=1)
        )
        .not_valid_after(
            datetime.datetime.now(datetime.timezone.utc)
            + datetime.timedelta(days=365 * 5)
        )
        .add_extension(
            x509.SubjectKeyIdentifier.from_public_key(private_key.public_key()),
            critical=False,
        )
        .sign(private_key, hashes.SHA256())
    )

    pfx_data = pkcs12.serialize_key_and_certificates(
        name=b"DocScalar Key",
        key=private_key,
        cert=cert,
        cas=None,
        encryption_algorithm=pkcs12.BestAvailableEncryption(b"docscalar"),
    )
    return pfx_data


def digitally_sign_pdf(
    input_pdf_path: str,
    output_pdf_path: str,
    pfx_bytes: bytes,
    passphrase: bytes,
    page_index: int = 0,
    visual_coords: tuple = None,
    signature_image_bytes: bytes = None,
):
    """
    Seal the input PDF with the certificate pfx_bytes and write it incrementally to output_pdf_path.
    If visual_coords and signature_image_bytes are provided, stamps a visible, clickable signature block.
    """
    signer = signers.SimpleSigner.load_pkcs12(pfx_file=pfx_bytes, passphrase=passphrase)

    success_visible = False

    if visual_coords and signature_image_bytes:
        try:
            with tempfile.NamedTemporaryFile(delete=False, suffix=".png") as tmp_img:
                tmp_img.write(signature_image_bytes)
                tmp_img_path = tmp_img.name

            try:
                with open(input_pdf_path, "rb") as inf:
                    w = IncrementalPdfFileWriter(inf)
                    field_name = "DocScalarSignatureField"
                    fields.append_signature_field(
                        w,
                        sig_field_spec=fields.SigFieldSpec(
                            field_name, box=visual_coords, on_page=page_index
                        ),
                    )

                    stamp_style = stamp.TextStampStyle(
                        stamp_text="",
                        background=images.PdfImage(tmp_img_path),
                        background_opacity=1,
                    )

                    meta = signers.PdfSignatureMetadata(field_name=field_name)
                    pdf_signer = signers.PdfSigner(
                        meta, signer=signer, stamp_style=stamp_style
                    )

                    with open(output_pdf_path, "wb") as outf:
                        pdf_signer.sign_pdf(w, output=outf)
                success_visible = True
            finally:
                try:
                    Path(tmp_img_path).unlink(missing_ok=True)
                except Exception:
                    pass
        except Exception as e:
            print(
                f"[SIGN] Failed to apply visible signature box ({e}). Falling back to invisible signature."
            )
            success_visible = False

    if not success_visible:
        with open(input_pdf_path, "rb") as inf:
            w = IncrementalPdfFileWriter(inf)
            meta = signers.PdfSignatureMetadata(
                field_name="DocScalarSignature",
                reason="Digitally Sealed via DocScalar Security Service",
            )

            out = signers.sign_pdf(
                w,
                meta,
                signer=signer,
            )

            with open(output_pdf_path, "wb") as outf:
                outf.write(out.read())


def sign_pdf(
    input_path: str,
    pfx_bytes_hex: str,
    passphrase_str: str,
    page_index: int = 0,
    x1: float = 0,
    y1: float = 0,
    x2: float = 0,
    y2: float = 0,
    signature_image_hex: str = "",
) -> ConversionResult:
    """
    Background worker task to sign a PDF.
    """
    try:
        update_job_progress(10)
        input_file = Path(input_path)
        if not input_file.exists():
            return ConversionResult(
                success=False, error_message="Input file does not exist"
            )

        output_file = config.OUTPUT_DIR / f"{input_file.stem}_signed.pdf"

        update_job_progress(30)
        if not pfx_bytes_hex:
            # Generate self-signed cert
            pfx_bytes = generate_self_signed_pfx()
            passphrase = b"docscalar"
        else:
            pfx_bytes = bytes.fromhex(pfx_bytes_hex)
            passphrase = passphrase_str.encode("utf-8")

        visual_coords = None
        sig_img_bytes = None

        if signature_image_hex and x2 > x1 and y2 > y1:
            visual_coords = (int(x1), int(y1), int(x2), int(y2))
            sig_img_bytes = bytes.fromhex(signature_image_hex)

        update_job_progress(60)
        digitally_sign_pdf(
            str(input_file),
            str(output_file),
            pfx_bytes,
            passphrase,
            page_index=page_index,
            visual_coords=visual_coords,
            signature_image_bytes=sig_img_bytes,
        )

        update_job_progress(95)
        if not output_file.exists():
            return ConversionResult(
                success=False, error_message="Signed output file was not created"
            )

        update_job_progress(100)
        return ConversionResult(
            success=True,
            output_path=str(output_file),
            file_size_bytes=output_file.stat().st_size,
        )
    except Exception as e:
        return ConversionResult(
            success=False, error_message=f"Digital signing failed: {e!s}"
        )
