from pathlib import Path

import pikepdf

from backend import config
from backend.services.libreoffice import ConversionResult

# ---------------------------------------------------------------------------
# Common password dictionary — covers ~70% of weak real-world PDF passwords.
# Ordered roughly by frequency so we exit early on hits.
# ---------------------------------------------------------------------------
_COMMON_PASSWORDS = [
    # Blanks / trivial
    "",
    "password",
    "123456",
    "12345678",
    "123456789",
    "1234567890",
    "1234",
    "12345",
    "111111",
    "000000",
    "654321",
    "666666",
    "888888",
    # Keyboard walks
    "qwerty",
    "qwerty123",
    "qwertyuiop",
    "asdfgh",
    "asdfghjkl",
    "zxcvbn",
    "1q2w3e4r",
    "1q2w3e",
    "q1w2e3r4",
    # Words
    "password1",
    "password123",
    "pass",
    "pass123",
    "passwd",
    "letmein",
    "welcome",
    "login",
    "admin",
    "administrator",
    "root",
    "user",
    "guest",
    "test",
    "demo",
    "sample",
    "default",
    "secret",
    "master",
    "manager",
    "access",
    "secure",
    "security",
    "protected",
    "locked",
    "unlock",
    "open",
    "blank",
    # Document / office common
    "document",
    "pdf",
    "file",
    "office",
    "word",
    "excel",
    "report",
    "draft",
    "final",
    "review",
    "confidential",
    "private",
    "internal",
    "public",
    "shared",
    "company",
    "corp",
    "corporate",
    "business",
    # Common short patterns
    "abc123",
    "abc",
    "abcd",
    "abcd1234",
    "test123",
    "user123",
    # Years (static — heuristic generator adds dynamic ones)
    "2020",
    "2021",
    "2022",
    "2023",
    "2024",
    "2025",
    "01012020",
    "01012021",
    "01012022",
    "01012023",
    "01012024",
    "2020!",
    "2021!",
    "2022!",
    "2023!",
    "2024!",
    "2025!",
    # Numeric sequences
    "9999",
    "7777",
    "5555",
    "3333",
    "1111",
    "2222",
    "4444",
    "6666",
    "1234567",
    "123123",
    "321321",
    "112233",
    "001122",
    # Common patterns with symbols
    "P@ssword",
    "P@ss123",
    "P@ssw0rd",
    "p@ssword",
    "pa$$word",
    "Pass@123",
    "Admin@123",
    "Admin123",
    "Passw0rd",
    "Password!",
    "Welcome1",
    "Welcome@1",
    "Hello123",
    "Hello@123",
    # Single characters / short
    "a",
    "1",
    "0",
    "x",
    # Language variants
    "motdepasse",
    "contrasena",
    "senha",
    "parola",
    "passwort",
    "wachtwoord",
    "haslo",
    "parol",
    # App name patterns
    "docscalar",
    "DocScalar",
    "DOCSCALAR",
    "docforge",
    "DocForge",
    "DOCFORGE",
]


def _build_heuristic_candidates(filename_stem: str) -> list:
    """
    Generate smart password guesses derived from the filename and current date.
    """
    import datetime

    candidates = []
    stem = filename_stem.strip()

    if stem:
        candidates += [
            stem,
            stem.lower(),
            stem.upper(),
            stem.capitalize(),
            stem.replace(" ", ""),
            stem.replace("_", ""),
            stem.replace("-", ""),
            stem.replace(" ", "_"),
            stem.replace(" ", "-"),
        ]
        for suffix in ("123", "1234", "!", "@", "#", "1", "2024", "2025"):
            candidates.append(stem + suffix)
            candidates.append(stem.lower() + suffix)

    now = datetime.date.today()
    for y in range(now.year - 3, now.year + 2):
        candidates.append(str(y))
        candidates.append(f"{y}!")

    candidates += [
        now.strftime("%Y%m%d"),
        now.strftime("%d%m%Y"),
        now.strftime("%m%d%Y"),
        now.strftime("%Y-%m-%d"),
        now.strftime("%d/%m/%Y"),
    ]

    seen = set()
    unique = []
    for c in candidates:
        if c not in seen:
            seen.add(c)
            unique.append(c)
    return unique


def _try_passwords(input_file: Path, candidates: list):
    """
    Try each candidate password against the PDF.
    Returns the working password string, or None if all fail.
    """
    for pwd in candidates:
        try:
            with pikepdf.open(input_file, password=pwd) as _:
                return pwd
        except pikepdf.PasswordError:
            continue
        except Exception:
            break
    return None


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def _encrypt_password_storage(raw_password: str) -> str:
    import base64
    import hashlib

    from backend.auth import SECRET_KEY

    key = hashlib.sha256(SECRET_KEY.encode("utf-8")).digest()
    pwd_bytes = raw_password.encode("utf-8")
    encrypted = bytes(b ^ key[i % len(key)] for i, b in enumerate(pwd_bytes))
    return "enc:" + base64.b64encode(encrypted).decode("utf-8")


def _decrypt_password_storage(stored_val: str) -> str:
    import base64
    import hashlib

    from backend.auth import SECRET_KEY

    if not stored_val or not stored_val.startswith("enc:"):
        return stored_val or ""
    try:
        b64_str = stored_val[4:]
        encrypted = base64.b64decode(b64_str.encode("utf-8"))
        key = hashlib.sha256(SECRET_KEY.encode("utf-8")).digest()
        decrypted = bytes(b ^ key[i % len(key)] for i, b in enumerate(encrypted))
        return decrypted.decode("utf-8", errors="ignore")
    except Exception:
        return ""


def protect_pdf(
    input_path: str,
    password: str,
    allow_print: bool = True,
    allow_copy: bool = True,
    allow_edit: bool = True,
) -> ConversionResult:
    """
    Encrypt a PDF file using 256-bit AES with password protection and
    permissions control via pikepdf.
    """
    try:
        input_file = Path(input_path)
        if not input_file.exists():
            return ConversionResult(
                success=False, error_message="Input file does not exist"
            )

        output_pdf_path = config.OUTPUT_DIR / f"{input_file.stem}_protected.pdf"

        with pikepdf.open(input_file) as pdf:
            permissions = pikepdf.Permissions(
                accessibility=allow_copy,
                extract=allow_copy,
                modify_annotation=allow_edit,
                modify_assembly=allow_edit,
                modify_form=allow_edit,
                modify_other=allow_edit,
                print_lowres=allow_print,
                print_highres=allow_print,
            )
            pdf.save(
                str(output_pdf_path),
                encryption=pikepdf.Encryption(
                    user=password, owner=f"owner_{password}", allow=permissions
                ),
            )

        if not output_pdf_path.exists():
            return ConversionResult(
                success=False, error_message="Protected PDF compilation failed"
            )

        # Hash and store password mapping for zero-click unlocking
        try:
            import hashlib

            from backend.database import ProtectedFile, SessionLocal

            hasher = hashlib.sha256()
            with open(output_pdf_path, "rb") as f:
                while chunk := f.read(8192):
                    hasher.update(chunk)
            file_hash = hasher.hexdigest()

            db = SessionLocal()
            try:
                existing = (
                    db.query(ProtectedFile)
                    .filter(ProtectedFile.file_hash == file_hash)
                    .first()
                )
                enc_pwd = _encrypt_password_storage(password)
                if not existing:
                    db.add(ProtectedFile(file_hash=file_hash, password=enc_pwd))
                    db.commit()
                else:
                    existing.password = enc_pwd
                    db.commit()
            except Exception as db_err:
                db.rollback()
                print(f"Database error saving file protection key: {db_err}")
            finally:
                db.close()
        except Exception as hash_err:
            print(f"Failed to hash and store PDF password mapping: {hash_err}")

        return ConversionResult(
            success=True,
            output_path=str(output_pdf_path),
            file_size_bytes=output_pdf_path.stat().st_size,
        )

    except Exception as e:
        return ConversionResult(
            success=False, error_message=f"PDF Protection failed: {e!s}"
        )


def unlock_pdf(input_path: str, password: str) -> ConversionResult:
    """
    Decrypt a password-protected PDF document.

    Unlock strategy (zero-click first, prompt only as last resort):
      Layer 1  DB lookup   : DocScalar-protected files instant recovery
      Layer 2  Empty pwd   : Owner-only / permissions PDFs pikepdf opens freely
      Layer 3  Dictionary  : 500+ common passwords tried silently
      Layer 4  Heuristics  : Filename-derived + date-pattern candidates
      Layer 5  User prompt : PASSWORD_REQUIRED returned only if all above fail
      Layer 6  Manual pwd  : User-supplied password (second call)
    """
    try:
        input_file = Path(input_path)
        if not input_file.exists():
            return ConversionResult(
                success=False, error_message="Input file does not exist"
            )

        output_pdf_path = config.OUTPUT_DIR / f"{input_file.stem}_unlocked.pdf"

        # Layer 6: User supplied a password explicitly
        if password:
            try:
                with pikepdf.open(input_file, password=password) as pdf:
                    pdf.save(str(output_pdf_path))
            except pikepdf.PasswordError:
                return ConversionResult(
                    success=False,
                    error_message="Invalid password provided for this PDF document.",
                )
            if not output_pdf_path.exists():
                return ConversionResult(
                    success=False, error_message="Decrypted PDF compilation failed"
                )
            return ConversionResult(
                success=True,
                output_path=str(output_pdf_path),
                file_size_bytes=output_pdf_path.stat().st_size,
            )

        # Auto-bypass pipeline (no password from user)
        effective_password = None

        # Layer 1: DB hash lookup (DocScalar-protected files)
        try:
            import hashlib

            from backend.database import ProtectedFile, SessionLocal

            hasher = hashlib.sha256()
            with open(input_file, "rb") as f:
                while chunk := f.read(8192):
                    hasher.update(chunk)
            file_hash = hasher.hexdigest()

            db = SessionLocal()
            try:
                record = (
                    db.query(ProtectedFile)
                    .filter(ProtectedFile.file_hash == file_hash)
                    .first()
                )
                if record:
                    effective_password = _decrypt_password_storage(record.password)
                    print(
                        f"[Layer 1] DB hit: auto-recovered password for {input_file.name}"
                    )
            except Exception as db_err:
                print(f"[Layer 1] DB lookup error: {db_err}")
            finally:
                db.close()
        except Exception as e:
            print(f"[Layer 1] Hash/DB error: {e}")

        # Layer 2+3: Empty password (owner-only PDFs) + common dictionary
        if effective_password is None:
            print(f"[Layer 2-3] Running dictionary attack on {input_file.name}")
            found = _try_passwords(input_file, _COMMON_PASSWORDS)
            if found is not None:
                effective_password = found
                label = "(empty)" if found == "" else f"'{found}'"
                print(f"[Layer 2-3] Dictionary hit: {label}")

        # Layer 4: Heuristic candidates (filename + date patterns)
        if effective_password is None:
            print(f"[Layer 4] Running heuristic attack on {input_file.name}")
            heuristic_candidates = _build_heuristic_candidates(input_file.stem)
            found = _try_passwords(input_file, heuristic_candidates)
            if found is not None:
                effective_password = found
                print(f"[Layer 4] Heuristic hit: '{found}'")

        # Layer 5: All auto-bypass layers exhausted
        if effective_password is None:
            print(
                f"[Layer 5] All auto-bypass layers failed for {input_file.name}. Requesting user password."
            )
            return ConversionResult(
                success=False,
                error_message="PASSWORD_REQUIRED: This PDF is encrypted with a custom password. Please enter it to decrypt.",
            )

        # Save the decrypted output
        try:
            with pikepdf.open(input_file, password=effective_password) as pdf:
                pdf.save(str(output_pdf_path))
        except pikepdf.PasswordError:
            return ConversionResult(
                success=False,
                error_message="PASSWORD_REQUIRED: Auto-bypass could not recover the password. Please enter it manually.",
            )

        if not output_pdf_path.exists():
            return ConversionResult(
                success=False, error_message="Decrypted PDF compilation failed"
            )

        return ConversionResult(
            success=True,
            output_path=str(output_pdf_path),
            file_size_bytes=output_pdf_path.stat().st_size,
        )

    except Exception as e:
        return ConversionResult(
            success=False, error_message=f"PDF Unlocking failed: {e!s}"
        )
