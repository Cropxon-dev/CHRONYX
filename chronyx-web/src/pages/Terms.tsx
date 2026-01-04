import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";

const Terms = () => {
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

        <h1 className="text-3xl font-light tracking-wide text-foreground mb-2">Terms & Conditions</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: January 2, 2026</p>

        <div className="prose prose-sm dark:prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-medium text-foreground mb-3">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              By accessing and using CHRONYX, you accept and agree to be bound by these Terms and Conditions. If you do not agree to these terms, please do not use our service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-medium text-foreground mb-3">2. Description of Service</h2>
            <p className="text-muted-foreground leading-relaxed">
              CHRONYX is a personal life management platform that allows you to organize tasks, study materials, financial records, insurance policies, and memories in one private space.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-medium text-foreground mb-3">3. User Accounts</h2>
            <p className="text-muted-foreground leading-relaxed">
              You are responsible for:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
              <li>Maintaining the confidentiality of your account</li>
              <li>All activities that occur under your account</li>
              <li>Providing accurate and complete information</li>
              <li>Notifying us of any unauthorized access</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-medium text-foreground mb-3">4. Acceptable Use</h2>
            <p className="text-muted-foreground leading-relaxed">
              You agree not to:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
              <li>Use the service for any illegal purpose</li>
              <li>Upload malicious content or viruses</li>
              <li>Attempt to gain unauthorized access</li>
              <li>Interfere with the service's operation</li>
              <li>Share your account with others</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-medium text-foreground mb-3">5. Intellectual Property</h2>
            <p className="text-muted-foreground leading-relaxed">
              The CHRONYX platform, including its design, features, and code, is owned by CROPXON. You retain ownership of all content you upload to the platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-medium text-foreground mb-3">6. Service Availability</h2>
            <p className="text-muted-foreground leading-relaxed">
              We strive to maintain 99.9% uptime but cannot guarantee uninterrupted access. We may perform maintenance that temporarily affects availability.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-medium text-foreground mb-3">7. Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed">
              CHRONYX is provided "as is" without warranties. We are not liable for any indirect, incidental, or consequential damages arising from your use of the service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-medium text-foreground mb-3">8. Termination</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may terminate or suspend your account for violations of these terms. You may delete your account at any time through Settings.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-medium text-foreground mb-3">9. Changes to Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update these terms from time to time. Continued use of the service after changes constitutes acceptance of the new terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-medium text-foreground mb-3">10. Contact</h2>
            <p className="text-muted-foreground leading-relaxed">
              For questions about these terms, contact us at legal@cropxon.com
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

export default Terms;
