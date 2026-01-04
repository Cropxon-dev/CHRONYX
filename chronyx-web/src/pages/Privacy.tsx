import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";

const Privacy = () => {
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

        <h1 className="text-3xl font-light tracking-wide text-foreground mb-2">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: January 2, 2026</p>

        <div className="prose prose-sm dark:prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-medium text-foreground mb-3">1. Introduction</h2>
            <p className="text-muted-foreground leading-relaxed">
              CHRONYX ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your personal information when you use our personal life management platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-medium text-foreground mb-3">2. Information We Collect</h2>
            <p className="text-muted-foreground leading-relaxed">
              We collect information you provide directly, including:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
              <li>Account information (email, name, date of birth)</li>
              <li>Financial data (expenses, income, loans, insurance details)</li>
              <li>Study records and task lists</li>
              <li>Photos and memories you upload</li>
              <li>Documents and files</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-medium text-foreground mb-3">3. How We Use Your Information</h2>
            <p className="text-muted-foreground leading-relaxed">
              Your data is used solely to provide CHRONYX services to you:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
              <li>Storing and organizing your personal records</li>
              <li>Generating insights and reports</li>
              <li>Sending reminders and notifications (when enabled)</li>
              <li>Improving our services</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-medium text-foreground mb-3">4. Data Security</h2>
            <p className="text-muted-foreground leading-relaxed">
              We implement industry-standard security measures to protect your data:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
              <li>End-to-end encryption for sensitive data</li>
              <li>Secure cloud storage with regular backups</li>
              <li>Row-level security for database access</li>
              <li>Regular security audits</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-medium text-foreground mb-3">5. Data Ownership</h2>
            <p className="text-muted-foreground leading-relaxed">
              You own all your data. You can export your complete data at any time in JSON or PDF format. We never sell or share your personal data with third parties for marketing purposes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-medium text-foreground mb-3">6. Cookies</h2>
            <p className="text-muted-foreground leading-relaxed">
              We use essential cookies for authentication and session management. We do not use tracking or advertising cookies.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-medium text-foreground mb-3">7. Your Rights</h2>
            <p className="text-muted-foreground leading-relaxed">
              You have the right to:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
              <li>Access your personal data</li>
              <li>Export all your data</li>
              <li>Delete your account and all associated data</li>
              <li>Opt out of non-essential communications</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-medium text-foreground mb-3">8. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              For privacy-related questions, contact us at privacy@cropxon.com
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

export default Privacy;
