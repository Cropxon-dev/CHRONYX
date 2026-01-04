import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";

const Refund = () => {
  return (
    <motion.main
      className="min-h-screen bg-background"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        <h1 className="text-3xl font-light tracking-wide text-foreground mb-2">Refund Policy</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: January 2, 2026</p>

        <div className="prose prose-sm dark:prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-medium text-foreground mb-3">1. Free Plan</h2>
            <p className="text-muted-foreground leading-relaxed">
              The Free plan is completely free forever. No payment is required, and therefore no refunds apply.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-medium text-foreground mb-3">2. Pro Plan Refunds</h2>
            <p className="text-muted-foreground leading-relaxed">
              For Pro plan subscriptions:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
              <li>Full refund within 7 days of purchase if unsatisfied</li>
              <li>Prorated refund for unused months if cancelled within 30 days</li>
              <li>No refunds after 30 days of subscription</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-medium text-foreground mb-3">3. Premium Lifetime Refunds</h2>
            <p className="text-muted-foreground leading-relaxed">
              For Premium (Lifetime) purchases:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
              <li>Full refund within 14 days if not satisfied</li>
              <li>50% refund within 30 days with valid reason</li>
              <li>No refunds after 30 days</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-medium text-foreground mb-3">4. How to Request a Refund</h2>
            <p className="text-muted-foreground leading-relaxed">
              To request a refund:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
              <li>Email refunds@cropxon.com with your account email</li>
              <li>Include your order/transaction ID</li>
              <li>Briefly explain the reason for refund</li>
              <li>Allow 5-7 business days for processing</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-medium text-foreground mb-3">5. Refund Method</h2>
            <p className="text-muted-foreground leading-relaxed">
              Refunds will be processed to the original payment method. Depending on your bank, it may take 5-10 business days to appear in your account.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-medium text-foreground mb-3">6. Exceptions</h2>
            <p className="text-muted-foreground leading-relaxed">
              Refunds may be denied in cases of:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
              <li>Abuse of the refund policy</li>
              <li>Multiple refund requests from the same user</li>
              <li>Violation of Terms of Service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-medium text-foreground mb-3">7. Contact</h2>
            <p className="text-muted-foreground leading-relaxed">
              For refund inquiries, contact refunds@cropxon.com
            </p>
          </section>
        </div>

        <div className="mt-12 pt-6 border-t border-border text-center">
          <p className="text-xs text-muted-foreground/60">CHRONYX by CROPXON</p>
        </div>
      </div>
    </motion.main>
  );
};

export default Refund;
