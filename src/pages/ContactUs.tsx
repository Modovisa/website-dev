import { useState } from "react";
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
import logoSvg from "@/assets/logo.svg";

const ContactUs = () => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    subject: "",
    name: "",
    email: "",
    message: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.subject || !formData.name || !formData.email || !formData.message) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Message Sent!",
      description: "We'll get back to you as soon as possible.",
    });

    setFormData({
      subject: "",
      name: "",
      email: "",
      message: "",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-400 via-pink-300 to-yellow-300 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Main Card */}
        <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-12 space-y-8">
          {/* Logo and Tagline */}
          <div className="text-center space-y-3">
            <div className="flex justify-center mb-4">
              <img src={logoSvg} alt="Modovisa" className="h-12" />
            </div>
            <p className="text-muted-foreground text-sm">Intuitive Analytics.</p>
          </div>

          {/* Heading */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold">Contact Us</h1>
            <p className="text-muted-foreground">
              Have a question or feedback? We're here to help.
            </p>
          </div>

          {/* Contact Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Subject */}
            <div className="space-y-2">
              <Label htmlFor="subject" className="text-base font-semibold">
                Subject <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.subject}
                onValueChange={(value) =>
                  setFormData({ ...formData, subject: value })
                }
              >
                <SelectTrigger className="h-12 border-primary/20 focus:border-primary">
                  <SelectValue placeholder="— Please choose an option —" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bug-report">Bug Report</SelectItem>
                  <SelectItem value="feature-request">Feature Request</SelectItem>
                  <SelectItem value="technical-support">Technical Support</SelectItem>
                  <SelectItem value="billing-support">Billing Support</SelectItem>
                  <SelectItem value="partnership-inquiry">Partnership Inquiry</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
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
                  setFormData({ ...formData, name: e.target.value })
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
                  setFormData({ ...formData, email: e.target.value })
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
                  setFormData({ ...formData, message: e.target.value })
                }
                className="min-h-[120px] border-primary/20 focus:border-primary resize-none"
              />
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full h-12 text-base font-semibold"
              size="lg"
            >
              Send Message
            </Button>
          </form>

          {/* Footer Note */}
          <p className="text-center text-sm text-muted-foreground">
            Please add{" "}
            <span className="font-semibold text-foreground">
              we.care@modovisa.com
            </span>{" "}
            to your contacts to avoid missing replies.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ContactUs;
