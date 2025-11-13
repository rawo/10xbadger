/**
 * FeaturesSection Component
 *
 * Displays key features and benefits of the 10xBadger platform
 * with engaging visuals and clear value propositions.
 */

import { Award, Zap, BarChart3, Shield, Users, Rocket } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface Feature {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
}

const features: Feature[] = [
  {
    icon: <Award className="h-8 w-8" />,
    title: "Badge Management",
    description: "Create, track, and showcase your professional achievements with our comprehensive badge system.",
    color: "text-blue-600 dark:text-blue-400",
  },
  {
    icon: <Zap className="h-8 w-8" />,
    title: "Fast & Intuitive",
    description: "Built with modern tech for lightning-fast performance and seamless user experience.",
    color: "text-purple-600 dark:text-purple-400",
  },
  {
    icon: <BarChart3 className="h-8 w-8" />,
    title: "Progress Tracking",
    description: "Visualize your career growth with real-time analytics and progress indicators.",
    color: "text-orange-600 dark:text-orange-400",
  },
  {
    icon: <Shield className="h-8 w-8" />,
    title: "Secure & Reliable",
    description: "Enterprise-grade security with role-based access control and data protection.",
    color: "text-blue-600 dark:text-blue-400",
  },
  {
    icon: <Users className="h-8 w-8" />,
    title: "Team Collaboration",
    description: "Administrators can review and approve applications with streamlined workflows.",
    color: "text-purple-600 dark:text-purple-400",
  },
  {
    icon: <Rocket className="h-8 w-8" />,
    title: "Career Advancement",
    description: "Build compelling promotion submissions with validated badge requirements.",
    color: "text-orange-600 dark:text-orange-400",
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="bg-background py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl text-center mb-12">
          <h2 className="mb-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
            Everything You Need to Succeed
          </h2>
          <p className="text-lg text-muted-foreground">
            Powerful features designed to simplify your career progression and make promotion management effortless.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <Card key={index} className="group border-2 transition-all hover:border-primary hover:shadow-lg">
              <CardContent className="p-6">
                <div
                  className={`mb-4 inline-flex rounded-lg bg-primary/10 p-3 ${feature.color} transition-transform group-hover:scale-110`}
                >
                  {feature.icon}
                </div>
                <h3 className="mb-2 text-xl font-semibold text-foreground">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
