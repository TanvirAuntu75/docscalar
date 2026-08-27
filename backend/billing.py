import os
from datetime import datetime, timezone

import stripe
from fastapi import APIRouter, Depends, Header, HTTPException, Request
from sqlalchemy.orm import Session

from backend.auth import get_current_user
from backend.database import Subscription, User, get_db

stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "")

router = APIRouter(prefix="/api/billing", tags=["Billing"])


@router.post("/create-checkout")
def create_checkout(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    # Check if Stripe is configured
    if not stripe.api_key:
        raise HTTPException(
            status_code=501,
            detail="Stripe is not configured in backend environment variables.",
        )

    try:
        session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            line_items=[
                {
                    "price": os.getenv("STRIPE_PRO_PRICE_ID", "price_12345"),
                    "quantity": 1,
                }
            ],
            mode="subscription",
            success_url=os.getenv(
                "STRIPE_SUCCESS_URL",
                "http://localhost:5173/dashboard?session_id={CHECKOUT_SESSION_ID}",
            ),
            cancel_url=os.getenv("STRIPE_CANCEL_URL", "http://localhost:5173/pricing"),
            client_reference_id=current_user.id,
            customer_email=current_user.email,
        )
        return {"checkout_url": session.url}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Stripe error: {e!s}")


@router.post("/webhook")
async def stripe_webhook(
    request: Request,
    stripe_signature: str = Header(None),
    db: Session = Depends(get_db),
):
    payload = await request.body()

    # 1. Verify Webhook Signature (Critical Security Requirement!)
    try:
        event = stripe.Webhook.construct_event(
            payload, stripe_signature, STRIPE_WEBHOOK_SECRET
        )
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid Stripe webhook payload.")
    except stripe.error.SignatureVerificationError:
        raise HTTPException(
            status_code=400,
            detail="Invalid Stripe webhook signature verification failed.",
        )

    event_type = event.get("type")
    data_object = event.get("data", {}).get("object", {})

    # 2. Process Webhook Event Types
    if event_type == "checkout.session.completed":
        user_id = data_object.get("client_reference_id")
        stripe_cust_id = data_object.get("customer")

        if user_id:
            user = db.query(User).filter(User.id == user_id).first()
            if user:
                # Update user tier to "pro"
                user.tier = "pro"
                # Save subscription record
                sub = (
                    db.query(Subscription)
                    .filter(Subscription.user_id == user_id)
                    .first()
                )
                if not sub:
                    sub = Subscription(
                        user_id=user_id,
                        stripe_customer_id=stripe_cust_id,
                        status="active",
                    )
                    db.add(sub)
                else:
                    sub.stripe_customer_id = stripe_cust_id or sub.stripe_customer_id
                    sub.status = "active"
                db.commit()
                print(f"Stripe Webhook: User {user_id} tier upgraded to PRO.")

    elif event_type in [
        "customer.subscription.updated",
        "customer.subscription.deleted",
    ]:
        stripe_cust_id = data_object.get("customer")
        sub_status = data_object.get(
            "status"
        )  # e.g. "active", "trialing", "canceled", "unpaid"
        current_period_end = data_object.get("current_period_end")

        # Locate user via subscription record
        sub = (
            db.query(Subscription)
            .filter(Subscription.stripe_customer_id == stripe_cust_id)
            .first()
        )
        if sub:
            user = db.query(User).filter(User.id == sub.user_id).first()
            if user:
                if sub_status in ["active", "trialing"]:
                    user.tier = "pro"
                    sub.status = sub_status
                else:
                    user.tier = "free"  # Downgrade if subscription is canceled/failed
                    sub.status = sub_status

                if current_period_end:
                    sub.expires_at = datetime.fromtimestamp(
                        current_period_end, tz=timezone.utc
                    )

                db.commit()
                print(
                    f"Stripe Webhook: Updated subscription status for User {user.id} to {sub_status}."
                )

    return {"status": "success"}
