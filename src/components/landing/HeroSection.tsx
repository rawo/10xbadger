/**
 * HeroSection Component
 *
 * Main hero section for the landing page showcasing the value proposition
 * of 10xBadger with a prominent call-to-action.
 */

import { Button } from "@/components/ui/button";
import { ArrowRight, Award, TrendingUp, Target } from "lucide-react";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-purple-50 to-orange-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.5))] dark:bg-grid-slate-700/25" />

      <div className="container relative mx-auto px-4 py-16 md:py-24 lg:py-32">
        <div className="mx-auto max-w-5xl text-center">
          {/* Subtitle */}
          <p className="mb-4 text-sm font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
            Your Promotions at Hand
          </p>

          {/* Main Headline */}
          <h1 className="mb-6 text-4xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-5xl md:text-6xl lg:text-7xl">
            Career Growth Made
            <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-orange-600 bg-clip-text text-transparent">
              {" "}
              Simple
            </span>
          </h1>

          {/* Description */}
          <p className="mx-auto mb-8 max-w-2xl text-lg text-gray-600 dark:text-gray-300 md:text-xl">
            Track your achievements, manage badges, and build promotion submissions all in one powerful platform
            designed for ambitious professionals.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button
              asChild
              size="lg"
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 shadow-lg shadow-blue-500/50 dark:shadow-blue-500/30 transition-all hover:shadow-xl"
            >
              <a href="/login" className="inline-flex items-center gap-2">
                Get Started
                <ArrowRight className="h-4 w-4" />
              </a>
            </Button>
            <Button asChild variant="outline" size="lg">
              <a href="#features">Learn More</a>
            </Button>
          </div>

          {/* Feature Pills */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-4 text-sm">
            <div className="flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 shadow-sm backdrop-blur dark:bg-slate-800/80">
              <Award className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span className="font-medium text-gray-700 dark:text-gray-300">Easy Promotion Management</span>
            </div>
            <div className="flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 shadow-sm backdrop-blur dark:bg-slate-800/80">
              <Target className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              <span className="font-medium text-gray-700 dark:text-gray-300">All Your Promotions in One Place</span>
            </div>
            <div className="flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 shadow-sm backdrop-blur dark:bg-slate-800/80">
              <TrendingUp className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              <span className="font-medium text-gray-700 dark:text-gray-300">Trackable Promotion Progress</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom wave decoration */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
          <path
            d="M0,64L80,69.3C160,75,320,85,480,80C640,75,800,53,960,48C1120,43,1280,53,1360,58.7L1440,64L1440,120L1360,120C1280,120,1120,120,960,120C800,120,640,120,480,120C320,120,160,120,80,120L0,120Z"
            className="fill-background"
          />
        </svg>
      </div>
    </section>
  );
}
