import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";
import { Sprout, Users, Shield } from "lucide-react";

const Login = () => {
  const navigate = useNavigate();
  const [credentials, setCredentials] = useState({
    username: "",
    password: ""
  });

  const handleLogin = (role: string) => {
    // Mock authentication - in real app, validate against backend
    if (credentials.username && credentials.password) {
      localStorage.setItem('userRole', role);
      localStorage.setItem('username', credentials.username);
      
      if (role === 'farmer') {
        navigate('/farmer');
      } else {
        navigate('/admin');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-earth flex items-center justify-center p-4">
      <div className="w-full max-w-4xl grid lg:grid-cols-2 gap-8 items-center">
        {/* Hero Section */}
        <div className="text-center lg:text-left space-y-6">
          <div className="flex items-center justify-center lg:justify-start gap-3">
            <div className="p-3 rounded-full bg-gradient-primary">
              <Sprout className="h-8 w-8 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-primary">Majayjay Farm</h1>
              <p className="text-sm text-muted-foreground">Resource Management System</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <h2 className="text-4xl lg:text-5xl font-bold text-foreground leading-tight">
              Smart Farming for{" "}
              <span className="text-transparent bg-clip-text bg-gradient-primary">
                Better Harvests
              </span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-md mx-auto lg:mx-0">
              Get expert crop recommendations, report farming issues, and connect with agricultural specialists to optimize your farm productivity.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Sprout className="h-4 w-4 text-success" />
              Crop Recommendations
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="h-4 w-4 text-success" />
              Expert Guidance
            </div>
          </div>
        </div>

        {/* Login Form */}
        <Card className="w-full max-w-md mx-auto shadow-card border-0 bg-card/80 backdrop-blur-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-foreground">Welcome Back</CardTitle>
            <CardDescription>Choose your login type to continue</CardDescription>
          </CardHeader>
          
          <CardContent>
            <Tabs defaultValue="farmer" className="space-y-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="farmer" className="flex items-center gap-2">
                  <Sprout className="h-4 w-4" />
                  Farmer
                </TabsTrigger>
                <TabsTrigger value="admin" className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Admin
                </TabsTrigger>
              </TabsList>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    placeholder="Enter your username"
                    value={credentials.username}
                    onChange={(e) => setCredentials({...credentials, username: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={credentials.password}
                    onChange={(e) => setCredentials({...credentials, password: e.target.value})}
                  />
                </div>
              </div>

              <TabsContent value="farmer" className="space-y-4 mt-6">
                <Button 
                  onClick={() => handleLogin('farmer')} 
                  className="w-full bg-gradient-primary hover:opacity-90 transition-opacity"
                  size="lg"
                >
                  Login as Farmer
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  Report farming issues and get personalized crop recommendations
                </p>
              </TabsContent>

              <TabsContent value="admin" className="space-y-4 mt-6">
                <Button 
                  onClick={() => handleLogin('admin')} 
                  className="w-full bg-gradient-primary hover:opacity-90 transition-opacity"
                  size="lg"
                >
                  Login as Administrator
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  Access analytics, manage reports and system configurations
                </p>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;