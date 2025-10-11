import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
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
  User
} from "lucide-react";
import dean from "@/assets/dean.jpg";
import hyroin from "@/assets/hyroin.jpg";
import joyce from "@/assets/joyce.jpg";
import dondon from "@/assets/don2.jpg";


const Landing = () => {
  const navigate = useNavigate();

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
    name: "Dean Martin Mabulay",
    role: "Lead Developer",
    avatar: <img src={dean} alt="Dean Martin Mabulay" className="h-24 w-24 rounded-full object-cover" />
  },
  {
    name: "Hyroin Balili",
    role: "Backend Developer",
    avatar: <img src={hyroin} alt="Hyroin Balili" className="h-24 w-24 rounded-full object-cover" />
  },
  {
    name: "Joyce Ann Cuala",
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
      {/* Hero Section */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center justify-center gap-3 mb-6">
              <div className="p-3 rounded-full bg-gradient-primary">
                <Sprout className="h-8 w-8 text-primary-foreground" />
              </div>
              <h1 className="text-2xl font-bold text-primary">Majayjay Farm Resource Management</h1>
            </div>

            <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6 leading-tight">
              Smart Farming for a{" "}
              <span className="text-transparent bg-clip-text bg-gradient-primary">
                Better Tomorrow
              </span>
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
              Empowering Majayjay farmers with expert crop recommendations, real-time analytics,
              and direct access to agricultural specialists for optimized farm productivity.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="bg-gradient-primary hover:opacity-90 transition-opacity text-lg px-8 py-6"
                onClick={() => navigate('/login')}
              >
                Get Started
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="text-lg px-8 py-6 border-2"
                onClick={() => navigate('/login')}
              >
                Learn More
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-card/50">
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
      <section className="py-16">
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

      {/* Testimonials Section */}
      <section className="py-16 bg-card/50">
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

      {/* Team Section */}
      <section className="py-16">
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
                className="text-center transition-all duration-300 hover:-translate-y-2 cursor-pointer group"
              >
                <div className="mx-auto mb-4 w-24 h-24 rounded-full overflow-hidden shadow-md transition-all duration-300 group-hover:shadow-lg">
                  {member.avatar}
                </div>
                <h3 className="text-xl font-semibold text-foreground">{member.name}</h3>
                <p className="text-muted-foreground">{member.role}</p>
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
              className="text-lg px-8 py-6"
              onClick={() => navigate('/login')}
            >
              Start Your Journey
              <ArrowRight className="ml-2 h-5 w-5" />
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
                <h3 className="text-lg font-bold text-primary">Majayjay Farm</h3>
                <p className="text-xs text-muted-foreground">Resource Management System</p>
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              © 2025 Majayjay Farm Resource Management System. Empowering farmers with smart technology.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;