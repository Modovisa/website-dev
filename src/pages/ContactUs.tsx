// src/pages/ContactUs.tsx

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { AnimatedGradientBackground } from "@/components/AnimatedGradientBackground";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ensureTurnstileLoaded } from "@/lib/turnstile";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "https://api.modovisa.com";

const TURNSTILE_SITE_KEY = "0x4AAAAAABZpGqOL1fgh-FTY";
const CONTACT_EMAIL_USER = "we.care";
const CONTACT_EMAIL_HOST = "modovisa.com";

const ContactUs = () => {
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    subject: "",
    name: "",
    email: "",
    message: "",
  });

  const [captchaToken, setCaptchaToken] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load Turnstile + set callback (same pattern as Bootstrap page)
  useEffect(() => {
    window.onTurnstileSuccess = (token: string) => {
      setCaptchaToken(token);
    };

    ensureTurnstileLoaded();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !formData.subject ||
      !formData.name ||
      !formData.email ||
      !formData.message
    ) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    if (!captchaToken) {
      toast({
        title: "CAPTCHA required",
        description: "Please complete the CAPTCHA before sending.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        name: formData.name,
        email: formData.email,
        subject: formData.subject,
        message: formData.message,
        captcha_token: captchaToken,
      };

      const res = await fetch(`${API_BASE}/api/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await res.json().catch(() => ({}));

      if (res.ok) {
        toast({
          title: "Message sent",
          description: "We’ll get back to you shortly.",
        });

        setFormData({
          subject: "",
          name: "",
          email: "",
          message: "",
        });
        setCaptchaToken("");

        // Reset widget if available
        window.turnstile?.reset();
      } else {
        toast({
          title: "Error sending message",
          description:
            (result && (result.error as string)) ||
            "Something went wrong. Please try again.",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Contact form error:", err);
      toast({
        title: "Unexpected error",
        description: "Please try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const supportEmail = `${CONTACT_EMAIL_USER}@${CONTACT_EMAIL_HOST}`;

  return (
    <AnimatedGradientBackground>
      <div className="w-full max-w-2xl">
        {/* Main Card (Bootstrap-style auth card) */}
        <div className="space-y-8 rounded-3xl bg-background/95 p-8 shadow-2xl backdrop-blur md:p-12">
          {/* Logo and Tagline */}
          <div className="space-y-3 text-center">
            <div className="flex flex-col items-center space-y-2 py-4">
              <Link to="/">
                <Logo showBeta={false} />
              </Link>
              <p className="mb-0 text-lg font-semibold">
                Intuitive Analytics.
              </p>
            </div>
          </div>

          {/* Heading */}
          <div className="space-y-2 text-center">
            <h1 className="text-3xl font-bold">Contact Us</h1>
            <p className="text-muted-foreground">
              Have a question or feedback? We&apos;re here to help.
            </p>
          </div>

          {/* Contact Form */}
          <form onSubmit={handleSubmit} className="space-y-6" id="contactForm">
            {/* Subject */}
            <div className="space-y-2">
              <Label htmlFor="subject" className="text-base font-semibold">
                Subject <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.subject}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, subject: value }))
                }
              >
                <SelectTrigger className="h-12 border-primary/20 focus:border-primary">
                  <SelectValue placeholder="— Please choose an option —" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Bug Report">Bug Report</SelectItem>
                  <SelectItem value="Feature Request">
                    Feature Request
                  </SelectItem>
                  <SelectItem value="Technical Support">
                    Technical Support
                  </SelectItem>
                  <SelectItem value="Billing Support">
                    Billing Support
                  </SelectItem>
                  <SelectItem value="Partnership Inquiry">
                    Partnership Inquiry
                  </SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-base font-semibold">
                Your Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                type="text"
                placeholder="Your name"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                className="h-12 border-primary/20 focus:border-primary"
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-base font-semibold">
                Your Email <span className="text-destructive">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, email: e.target.value }))
                }
                className="h-12 border-primary/20 focus:border-primary"
              />
            </div>

            {/* Message */}
            <div className="space-y-2">
              <Label htmlFor="message" className="text-base font-semibold">
                Your Message <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="message"
                placeholder="Let us know how we can help..."
                value={formData.message}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, message: e.target.value }))
                }
                className="min-h-[120px] resize-none border-primary/20 focus:border-primary"
              />
            </div>

            {/* Turnstile */}
            <div className="mt-2">
              <div
                className="cf-turnstile"
                data-sitekey={TURNSTILE_SITE_KEY}
                data-callback="onTurnstileSuccess"
              />
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="h-12 w-full text-base font-semibold"
              size="lg"
              disabled={isSubmitting}
              data-modovisa-event="contact-send-message"
            >
              {isSubmitting ? "Sending..." : "Send Message"}
            </Button>
          </form>

          {/* Footer Note */}
          <p className="text-center text-sm text-muted-foreground">
            Please add{" "}
            <a
              href={`mailto:${supportEmail}`}
              className="font-semibold text-foreground underline-offset-2 hover:underline"
            >
              {supportEmail}
            </a>{" "}
            to your contacts to avoid missing replies.
          </p>
        </div>
      </div>
    </AnimatedGradientBackground>
  );
};

export default ContactUs;
