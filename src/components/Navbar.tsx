import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, LogIn } from "lucide-react";

interface NavbarProps {
  className?: string;
  variant?: "default" | "transparent"; // For different page styles
}

export const Navbar = ({ className = "", variant = "default" }: NavbarProps) => {
  return (
    <nav className={`glass-nav rounded-full px-6 py-4 ${className}`}>
      <div className="flex items-center justify-between">
        {/* Mobile: Hamburger Menu */}
        <Sheet>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon" className="text-foreground">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[300px]">
            <div className="flex flex-col gap-4 mt-8">
              <Link to="#product" className="text-lg font-medium hover:text-primary transition-colors">
                Product
              </Link>
              <Link to="#features" className="text-lg font-medium hover:text-primary transition-colors">
                Features
              </Link>
              <Link to="#pricing" className="text-lg font-medium hover:text-primary transition-colors">
                Pricing
              </Link>
              <Link to="#faq" className="text-lg font-medium hover:text-primary transition-colors">
                FAQs
              </Link>
              <div className="pt-4 border-t">
                <Link to="/login">
                  <Button variant="outline" className="w-full mb-2">
                    Sign In
                  </Button>
                </Link>
                <Link to="/register">
                  <Button className="w-full">
                    Get Started
                  </Button>
                </Link>
              </div>
            </div>
          </SheetContent>
        </Sheet>

        {/* Logo - Desktop: Left aligned, Mobile: Center */}
        <div className="hidden md:block">
          <Logo className="text-foreground" />
        </div>
        <div className="md:hidden flex-1 flex justify-center">
          <Logo className="text-foreground" />
        </div>

        {/* Desktop: Nav Links (centered) */}
        <div className="hidden md:flex items-center gap-8 absolute left-1/2 transform -translate-x-1/2">
          <Link to="#product" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
            Product
          </Link>
          <Link to="#features" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
            Features
          </Link>
          <Link to="#pricing" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
            Pricing
          </Link>
          <Link to="#faq" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
            FAQs
          </Link>
        </div>

        {/* Desktop: Login/Register Buttons */}
        <div className="hidden md:flex items-center gap-4">
          <Link to="/login">
            <Button variant="ghost" className="text-foreground hover:bg-primary/10">
              Login/Register
            </Button>
          </Link>
        </div>

        {/* Mobile: Login Icon Button */}
        <div className="md:hidden">
          <Link to="/login">
            <Button size="icon" className="bg-primary text-primary-foreground hover:bg-primary/90">
              <LogIn className="h-5 w-5" />
            </Button>
          </Link>
        </div>
      </div>
    </nav>
  );
};