import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Sprout,
  Users,
  Shield,
  Leaf,
  BarChart3,
  MessageSquare,
  Star,
  CheckCircle,
  ArrowRight,
  User,
  Menu,
  X,
  Facebook,
  Mail,
  ChevronDown
} from "lucide-react";
import dean from "@/assets/dean.jpg";
import hyroin from "@/assets/hyroin.jpg";
import joyce from "@/assets/joyce.jpg";
import dondon from "@/assets/don2.jpg";
import herobg from "@/assets/herobg.jpg";

const Landing = () => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Function to scroll to a section
  const scrollToSection = (sectionId: string) => {
    setActiveSection(sectionId);
    setIsMobileMenuOpen(false); // Close mobile menu when clicking a link
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Track scroll position to update active section
  useEffect(() => {
    const handleScroll = () => {
      const sections = ['features', 'faq', 'testimonials', 'team'];
      const scrollPosition = window.scrollY + 100;

      for (const sectionId of sections) {
        const element = document.getElementById(sectionId);
        if (element) {
          const offsetTop = element.offsetTop;
          const offsetHeight = element.offsetHeight;

          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            setActiveSection(sectionId);
            return;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Check initial position

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const features = [
    {
      icon: <Leaf className="h-8 w-8 text-primary" />,
      title: "Crop Recommendations",
      description: "Get AI-powered crop recommendations based on soil conditions, weather patterns, and seasonal factors."
    },
    {
      icon: <BarChart3 className="h-8 w-8 text-primary" />,
      title: "Analytics Dashboard",
      description: "Track farm productivity, resource usage, and harvest predictions with comprehensive analytics."
    },
    {
      icon: <MessageSquare className="h-8 w-8 text-primary" />,
      title: "Expert Consultation",
      description: "Connect directly with agricultural specialists for personalized guidance and support."
    },
    {
      icon: <Shield className="h-8 w-8 text-primary" />,
      title: "Issue Reporting",
      description: "Report farming problems and get quick solutions from our expert community."
    }
  ];

  const steps = [
    {
      number: "01",
      title: "Sign Up",
      description: "Create your farmer or administrator account in seconds."
    },
    {
      number: "02",
      title: "Configure",
      description: "Set up your farm details, crops, and preferences."
    },
    {
      number: "03",
      title: "Analyze",
      description: "Receive personalized recommendations and insights."
    },
    {
      number: "04",
      title: "Harvest",
      description: "Implement recommendations and track improved results."
    }
  ];

  const testimonials = [
    {
      name: "Carlos Santos",
      role: "Local Farmer",
      content: "This system helped me increase my rice yield by 30% in just one season. The crop recommendations are spot on!",
      avatar: <User className="h-8 w-8" />
    },
    {
      name: "Maria Delgado",
      role: "Agricultural Specialist",
      content: "The platform makes it easy to provide expert guidance to farmers across the region. A game-changer for our community.",
      avatar: <User className="h-8 w-8" />
    },
    {
      name: "Antonio Reyes",
      role: "Farm Cooperative Leader",
      content: "Our cooperative's productivity has improved significantly since we started using this system. The analytics are invaluable.",
      avatar: <User className="h-8 w-8" />
    }
  ];

  const team = [
    {
      name: "Dean Mabulay",
      role: "Lead Developer",
      avatar: <img src={dean} alt="Dean Martin Mabulay" className="h-24 w-24 rounded-full object-cover" />
    },
    {
      name: "Hyroin Balili",
      role: "Backend Developer",
      avatar: <img src={hyroin} alt="Hyroin Balili" className="h-24 w-24 rounded-full object-cover" />
    },
    {
      name: "Joyce Cuala",
      role: "UI/UX Designer | Research Lead",
      avatar: <img src={joyce} alt="Joyce Ann Cuala" className="h-24 w-24 rounded-full object-cover" />
    },
    {
      name: "Dondon Esquivel",
      role: "Project Manager",
      avatar: <img src={dondon} alt="Dondon Esquivel" className="h-24 w-24 rounded-full object-cover" />
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-earth">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-sm border-b border-border shadow-soft">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo and text on the left - clickable to scroll to top */}
            <div 
              className="flex items-center gap-3 cursor-pointer"
              onClick={() => {
                // Scroll to the top of the page (hero section)
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            >
              <div className="p-2 rounded-lg bg-gradient-primary">
                <Sprout className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-primary">Harvestify</h1>
              </div>
            </div>

            {/* Desktop Navigation - hidden on mobile */}
            <nav className="hidden md:flex items-center space-x-4">
              <button
                onClick={() => scrollToSection('features')}
                className={`group text-foreground hover:text-accent-foreground px-3 py-2 text-sm font-medium transition-all duration-300 relative ${activeSection === 'features' ? 'text-yellow-500' : ''}`}
              >
                <span className="relative z-10">Overview</span>
                <span className={`absolute bottom-0 left-1/2 transform -translate-x-1/2 h-0.5 bg-yellow-500 transition-all duration-300 ${activeSection === 'features' ? 'w-full' : 'w-0 group-hover:w-full'}`}></span>
              </button>
              <button
                onClick={() => scrollToSection('testimonials')}
                className={`group text-foreground hover:text-accent-foreground px-3 py-2 text-sm font-medium transition-all duration-300 relative ${activeSection === 'testimonials' ? 'text-yellow-500' : ''}`}
              >
                <span className="relative z-10">Reviews</span>
                <span className={`absolute bottom-0 left-1/2 transform -translate-x-1/2 h-0.5 bg-yellow-500 transition-all duration-300 ${activeSection === 'testimonials' ? 'w-full' : 'w-0 group-hover:w-full'}`}></span>
              </button>
              <button
                onClick={() => scrollToSection('faq')}
                className={`group text-foreground hover:text-accent-foreground px-3 py-2 text-sm font-medium transition-all duration-300 relative ${activeSection === 'faq' ? 'text-yellow-500' : ''}`}
              >
                <span className="relative z-10">FAQ</span>
                <span className={`absolute bottom-0 left-1/2 transform -translate-x-1/2 h-0.5 bg-yellow-500 transition-all duration-300 ${activeSection === 'faq' ? 'w-full' : 'w-0 group-hover:w-full'}`}></span>
              </button>
              <button
                onClick={() => scrollToSection('team')}
                className={`group text-foreground hover:text-accent-foreground px-3 py-2 text-sm font-medium transition-all duration-300 relative ${activeSection === 'team' ? 'text-yellow-500' : ''}`}
              >
                <span className="relative z-10">About Us</span>
                <span className={`absolute bottom-0 left-1/2 transform -translate-x-1/2 h-0.5 bg-yellow-500 transition-all duration-300 ${activeSection === 'team' ? 'w-full' : 'w-0 group-hover:w-full'}`}></span>
              </button>
            </nav>

            {/* Mobile menu button - visible only on mobile */}
            <div className="md:hidden">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                aria-label="Toggle navigation menu"
              >
                {isMobileMenuOpen ? (
                  <X className="h-6 w-6" />
                ) : (
                  <Menu className="h-6 w-6" />
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Menu - shown when menu is open */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-card border-b border-border">
            <div className="px-2 pt-2 pb-3 space-y-1">
              <button
                onClick={() => scrollToSection('features')}
                className={`block w-full text-left px-3 py-2 text-base font-medium transition-all duration-300 relative ${activeSection === 'features' ? 'text-yellow-500' : 'text-foreground hover:text-accent-foreground'}`}
              >
                Overview
              </button>
              <button
                onClick={() => scrollToSection('testimonials')}
                className={`block w-full text-left px-3 py-2 text-base font-medium transition-all duration-300 relative ${activeSection === 'testimonials' ? 'text-yellow-500' : 'text-foreground hover:text-accent-foreground'}`}
              >
                Reviews
              </button>
              <button
                onClick={() => scrollToSection('faq')}
                className={`block w-full text-left px-3 py-2 text-base font-medium transition-all duration-300 relative ${activeSection === 'faq' ? 'text-yellow-500' : 'text-foreground hover:text-accent-foreground'}`}
              >
                FAQ
              </button>
              <button
                onClick={() => scrollToSection('team')}
                className={`block w-full text-left px-3 py-2 text-base font-medium transition-all duration-300 relative ${activeSection === 'team' ? 'text-yellow-500' : 'text-foreground hover:text-accent-foreground'}`}
              >
                About Us
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="py-16 md:py-24 relative">
        {/* Background image with gradient overlay */}
        <div 
          className="absolute inset-0 bg-cover bg-center z-0"
          style={{ 
            backgroundImage: `url(${herobg})`,
            backgroundPosition: 'center',
            backgroundSize: 'cover'
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-green-900 to-black opacity-80 z-0"></div>
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center justify-center gap-3 mb-6">
              <div className="p-3 rounded-full bg-gradient-primary">
                <Sprout className="h-8 w-8 text-primary-foreground" />
              </div>
              <h1 className="text-2xl font-bold text-white">Harvestify</h1>
            </div>

            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
              Smart Farming for a{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-500 to-teal-500">
                Better Tomorrow
              </span>
            </h1>

            <p className="text-lg md:text-xl text-white mb-10 max-w-2xl mx-auto">
              Empowering Majayjay farmers with expert crop recommendations, real-time analytics,
              and direct access to agricultural specialists for optimized farm productivity.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="bg-gradient-primary hover:opacity-90 transition-opacity text-lg px-8 py-6 relative group"
                onClick={() => navigate('/login')}
              >
                <span className="relative z-10 flex items-center">
                  Get Started
                  <ArrowRight className="ml-2 h-5 w-5" />
                </span>
                <span className="absolute inset-0 rounded-md bg-gradient-primary opacity-0 group-hover:opacity-100 blur-md transition-opacity"></span>
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="text-lg px-8 py-6 border-2 hover:bg-[#EAB949] hover:text-[#333333] hover:border-[#EAB949] relative group"
                onClick={() => {
                  const element = document.getElementById('how-it-works');
                  if (element) {
                    element.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
              >
                <span className="relative z-10">Learn More</span>
                <span className="absolute inset-0 rounded-md bg-[#EAB949] opacity-0 group-hover:opacity-100 blur-md transition-opacity"></span>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-16 bg-card/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Powerful Features for Modern Farming
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Everything you need to optimize your farm productivity and make data-driven decisions
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="border-0 shadow-card hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="mb-4">
                    {feature.icon}
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-muted-foreground">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              How It Works
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Get started in four simple steps and transform your farming experience
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <div key={index} className="text-center relative">
                <div className="mb-6">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-primary text-primary-foreground text-xl font-bold">
                    {step.number}
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">{step.title}</h3>
                <p className="text-muted-foreground">{step.description}</p>

                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-8 left-full w-full h-0.5 bg-gradient-primary"></div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}      <section id="testimonials" className="py-16 bg-card/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              What Farmers Say
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Hear from farmers who have transformed their agricultural practices
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="border-0 shadow-card">
                <CardContent className="pt-6">
                  <div className="flex items-center mb-4">
                    <div className="p-2 rounded-full bg-secondary mr-4">
                      {testimonial.avatar}
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground">{testimonial.name}</h4>
                      <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                    </div>
                  </div>
                  <p className="text-muted-foreground italic">"{testimonial.content}"</p>
                  <div className="flex mt-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 text-yellow-500 fill-current" />
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Find answers to common questions about Harvestify and our services
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <Accordion type="single" collapsible className="w-full space-y-4">
              <AccordionItem value="item-1" className="border rounded-lg px-4 bg-background">
                <AccordionTrigger className="py-4 hover:no-underline">
                  <div className="flex items-center gap-2 text-left">
                    <span className="font-medium">What is Harvestify and how does it work?</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-4 text-muted-foreground text-base">
                  Harvestify is a smart farming platform that provides AI-powered crop recommendations based on soil conditions, weather patterns, and market data. Our system analyzes multiple factors to suggest the best crops for your farm and connects you with agricultural experts for personalized guidance.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-2" className="border rounded-lg px-4 bg-background">
                <AccordionTrigger className="py-4 hover:no-underline">
                  <div className="flex items-center gap-2 text-left">
                    <span className="font-medium">Do I need technical expertise to use Harvestify?</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-4 text-muted-foreground text-base">
                  Not at all! Harvestify is designed to be user-friendly for farmers of all technical levels. Our intuitive interface guides you through the process, and our expert support team is always available to help you get the most out of our platform.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-3" className="border rounded-lg px-4 bg-background">
                <AccordionTrigger className="py-4 hover:no-underline">
                  <div className="flex items-center gap-2 text-left">
                    <span className="font-medium">How accurate are the crop recommendations?</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-4 text-muted-foreground text-base">
                  Our recommendations are based on advanced machine learning algorithms trained on extensive agricultural data. While we strive for the highest accuracy, we always recommend discussing recommendations with local agricultural experts and considering your specific farm conditions.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-4" className="border rounded-lg px-4 bg-background">
                <AccordionTrigger className="py-4 hover:no-underline">
                  <div className="flex items-center gap-2 text-left">
                    <span className="font-medium">Can I use Harvestify if I'm not in Majayjay?</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-4 text-muted-foreground text-base">
                  While Harvestify was initially developed for Majayjay farmers, our platform can be adapted for use in other regions. Contact our team to discuss how we can customize our services for your specific location and farming conditions.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-5" className="border rounded-lg px-4 bg-background">
                <AccordionTrigger className="py-4 hover:no-underline">
                  <div className="flex items-center gap-2 text-left">
                    <span className="font-medium">Is there a cost to use Harvestify?</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-4 text-muted-foreground text-base">
                  Harvestify is completely free to use for all farmers. All features, including crop recommendations, analytics, and expert consultations, are available at no cost. We believe in making smart farming accessible to everyone in Majayjay.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>
      </section>

      {/* Team Section */}      <section id="team" className="pt-16 pb-8 bg-card/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Our Expert Team
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Passionate professionals dedicated to revolutionizing agriculture in Majayjay
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {team.map((member, index) => (
              <div
                key={index}
                className="text-center transition-all duration-300 hover:-translate-y-2 cursor-pointer group relative"
              >
                <div className="mx-auto mb-4 w-24 h-24 rounded-full overflow-hidden shadow-md transition-all duration-300 group-hover:shadow-lg">
                  {member.avatar}
                </div>
                <h3 className="text-xl font-semibold text-foreground">{member.name}</h3>
                <p className="text-muted-foreground mb-2">{member.role}</p>
                
                {/* Social Icons - Visible on mobile, hover on desktop */}
                <div className="flex justify-center gap-2 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300 mt-2">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 hover:bg-transparent"
                    onClick={(e) => {
                      e.stopPropagation();
                      // Handle Facebook click - obfuscated links to prevent easy inspection
                      const facebookUrls = [
                        'https://www.facebook.com/deanmartin.mabulay',
                        'https://www.facebook.com/hyroin.balili',
                        'https://www.facebook.com/joyceann.cuala',
                        'https://www.facebook.com/dondon.esquivel.1'
                      ];
                      const url = facebookUrls[index % facebookUrls.length];
                      window.open(url, '_blank');
                    }}
                  >
                    <Facebook className="h-4 w-4 text-[#1877F2] md:group-hover:text-[#1877F2] transition-colors" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 hover:bg-transparent"
                    onClick={(e) => {
                      e.stopPropagation();
                      // Handle Email click - obfuscated emails to prevent easy inspection
                      const emailAddresses = [
                        'mabs.dm12@gmail.com',
                        'balilihyroin6@gmail.com',
                        'joyceanncuala3@gmail.com',
                        'dondonesquivel27@gmail.com'
                      ];
                      const email = emailAddresses[index % emailAddresses.length];
                      window.location.href = 'mailto:' + email;
                    }}
                  >
                    <Mail className="h-4 w-4 text-[#EA4335] md:group-hover:text-[#EA4335] transition-colors" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-hero">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
              Ready to Transform Your Farming?
            </h2>
            <p className="text-lg text-primary-foreground/90 mb-8">
              Join thousands of farmers already using our platform to increase productivity and profits
            </p>
            <Button
              size="lg"
              variant="secondary"
              className="text-lg px-8 py-6 relative group"
              onClick={() => navigate('/login')}
            >
              <span className="relative z-10 flex items-center">
                Start Your Journey
                <ArrowRight className="ml-2 h-5 w-5" />
              </span>
              <span className="absolute inset-0 rounded-md bg-secondary opacity-0 group-hover:opacity-100 blur-md transition-opacity"></span>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-card/80 backdrop-blur-sm border-t border-border py-5">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-gradient-primary">
                <Sprout className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-primary">Harvestify</h3>
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              © 2025 Harvestify. Empowering farmers with smart technology.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;