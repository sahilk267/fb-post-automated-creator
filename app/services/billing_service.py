import stripe
from sqlalchemy.orm import Session
from app.models.organization import Organization, SubscriptionTier
from app.core.config import settings
from datetime import datetime
from typing import Optional

if settings.stripe_api_key:
    stripe.api_key = settings.stripe_api_key

class BillingService:
    def __init__(self, db: Session):
        self.db = db

    def create_checkout_session(self, org: Organization, price_id: str, success_url: str, cancel_url: str):
        """Create a Stripe Checkout session for an organization."""
        if not stripe.api_key:
            raise ValueError("Stripe API key is not configured.")

        # Create or retrieve Stripe customer
        if not org.stripe_customer_id:
            customer = stripe.Customer.create(
                email=org.created_by.email if org.created_by else None,
                name=org.name,
                metadata={"org_id": org.id}
            )
            org.stripe_customer_id = customer.id
            self.db.commit()

        session = stripe.checkout.Session.create(
            customer=org.stripe_customer_id,
            payment_method_types=["card"],
            line_items=[{"price": price_id, "quantity": 1}],
            mode="subscription",
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={"org_id": str(org.id)}
        )
        return session.url

    def create_portal_session(self, org: Organization, return_url: str):
        """Create a Stripe Customer Portal session for an organization."""
        if not stripe.api_key:
            raise ValueError("Stripe API key is not configured.")
        if not org.stripe_customer_id:
            raise ValueError("No Stripe customer found for this organization.")
            
        session = stripe.billing_portal.Session.create(
            customer=org.stripe_customer_id,
            return_url=return_url
        )
        return session.url

    def handle_webhook(self, payload: bytes, sig_header: str):
        """Handle Stripe webhooks to update subscription status."""
        if not settings.stripe_webhook_secret:
            raise ValueError("Stripe Webhook Secret is not configured.")

        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, settings.stripe_webhook_secret
            )
        except Exception as e:
            raise ValueError(f"Invalid webhook payload/signature: {e}")

        if event['type'] == 'checkout.session.completed':
            session = event['data']['object']
            self._handle_subscription_success(session)
        elif event['type'] in ['customer.subscription.updated', 'customer.subscription.deleted']:
            subscription = event['data']['object']
            self._handle_subscription_change(subscription)

    def _handle_subscription_success(self, session):
        org_id = session.get('metadata', {}).get('org_id')
        if not org_id:
            return
        
        org = self.db.query(Organization).filter(Organization.id == int(org_id)).first()
        if org:
            org.subscription_status = "active"
            # We can detect the tier from price_id if we maintain a mapping
            # For now, let's keep it simple or use metadata from checkout session
            self.db.commit()

    def _handle_subscription_change(self, subscription):
        customer_id = subscription.get('customer')
        org = self.db.query(Organization).filter(Organization.stripe_customer_id == customer_id).first()
        if org:
            status = subscription.get('status')
            org.subscription_status = status
            
            if status == 'active':
                # Try to map to tier based on price_id in subscription.items
                try:
                    price_id = subscription.get('items', {}).get('data', [{}])[0].get('price', {}).get('id')
                    if price_id == settings.stripe_agency_price_id:
                        org.subscription_tier = SubscriptionTier.AGENCY
                    elif price_id == settings.stripe_pro_price_id:
                        org.subscription_tier = SubscriptionTier.PRO
                except Exception:
                    pass
            elif status in ['canceled', 'unpaid', 'incomplete_expired']:
                org.subscription_tier = SubscriptionTier.FREE
            
            # Update end date
            end_timestamp = subscription.get('current_period_end')
            if end_timestamp:
                org.subscription_ends_at = datetime.fromtimestamp(end_timestamp)
                
            self.db.commit()

    def get_org_limits(self, org: Organization):
        """Returns feature limits based on organization tier."""
        tier = org.subscription_tier
        if tier == SubscriptionTier.AGENCY:
            return {"max_posts_per_month": 500, "max_members": 20, "ai_optimized": True}
        if tier == SubscriptionTier.PRO:
            return {"max_posts_per_month": 100, "max_members": 5, "ai_optimized": True}
        return {"max_posts_per_month": 10, "max_members": 1, "ai_optimized": False}
