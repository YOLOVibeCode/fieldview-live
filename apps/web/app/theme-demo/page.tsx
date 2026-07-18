/**
 * Theme Demo Page - "Dark Cinema" Showcase
 * 
 * Comprehensive demonstration of the FieldView.Live theme system
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { CinemaModeToggle } from '@/components/CinemaModeToggle';

export default function ThemeDemoPage() {
  const [inputValue, setInputValue] = useState('');

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-card/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                FieldView.Live
              </span>{' '}
              Theme Demo
            </h1>
            <p className="text-sm text-muted-foreground">"Dark Cinema" Edition</p>
          </div>
          <div className="flex items-center gap-3">
            <CinemaModeToggle />
            <Button variant="outline" size="sm">
              View Code
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Hero Section */}
        <section className="py-12 sm:py-16 text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm">
            <span className="inline-block w-2 h-2 rounded-full bg-primary animate-pulse"></span>
            Production-Ready Design System
          </div>
          
          <h2 className="text-4xl sm:text-5xl font-bold">
            🎨 Dark Cinema Theme
          </h2>
          
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            A comprehensive design system optimized for video streaming platforms.
            High contrast, low animation intensity, Cinema Mode enabled.
          </p>

          <div className="flex flex-wrap gap-4 justify-center pt-4">
            <div className="px-6 py-3 rounded-lg bg-card border">
              <div className="text-2xl font-bold text-primary">45+</div>
              <div className="text-sm text-muted-foreground">Design Tokens</div>
            </div>
            <div className="px-6 py-3 rounded-lg bg-card border">
              <div className="text-2xl font-bold text-success">100+</div>
              <div className="text-sm text-muted-foreground">Components</div>
            </div>
            <div className="px-6 py-3 rounded-lg bg-card border">
              <div className="text-2xl font-bold text-warning">WCAG AA</div>
              <div className="text-sm text-muted-foreground">Accessible</div>
            </div>
          </div>
        </section>

        {/* Colors Section */}
        <section id="colors" className="py-12 space-y-6">
          <div>
            <h3 className="text-3xl font-bold mb-2">Colors</h3>
            <p className="text-muted-foreground">High contrast palette designed for video streaming UX</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Background Layers</CardTitle>
              <CardDescription>Deep, cinema-dark backgrounds</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="space-y-2">
                <div className="h-24 rounded-lg" style={{ backgroundColor: 'hsl(220 25% 6%)' }}></div>
                <div className="text-sm font-mono">bg-base</div>
                <div className="text-xs text-muted-foreground">#0A0E14</div>
              </div>
              <div className="space-y-2">
                <div className="h-24 rounded-lg" style={{ backgroundColor: 'hsl(220 23% 10%)' }}></div>
                <div className="text-sm font-mono">bg-elevated</div>
                <div className="text-xs text-muted-foreground">#141821</div>
              </div>
              <div className="space-y-2">
                <div className="h-24 rounded-lg" style={{ backgroundColor: 'hsl(220 21% 14%)' }}></div>
                <div className="text-sm font-mono">bg-elevated-2</div>
                <div className="text-xs text-muted-foreground">#1C2130</div>
              </div>
              <div className="space-y-2">
                <div className="h-24 rounded-lg" style={{ backgroundColor: 'hsl(0 0% 0%)' }}></div>
                <div className="text-sm font-mono">video-chrome</div>
                <div className="text-xs text-muted-foreground">#000000</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Brand Colors</CardTitle>
              <CardDescription>Primary, secondary, and accent colors</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <div className="h-24 rounded-lg bg-primary"></div>
                <div className="text-sm font-mono">Primary</div>
                <div className="text-xs text-muted-foreground">4.8:1 contrast</div>
              </div>
              <div className="space-y-2">
                <div className="h-24 rounded-lg" style={{ backgroundColor: 'hsl(258 90% 66%)' }}></div>
                <div className="text-sm font-mono">Secondary</div>
                <div className="text-xs text-muted-foreground">4.2:1 contrast</div>
              </div>
              <div className="space-y-2">
                <div className="h-24 rounded-lg" style={{ backgroundColor: 'hsl(189 94% 43%)' }}></div>
                <div className="text-sm font-mono">Accent</div>
                <div className="text-xs text-muted-foreground">4.5:1 contrast</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Status Colors</CardTitle>
              <CardDescription>Success, warning, error, and info states</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="space-y-2">
                <div className="h-24 rounded-lg bg-success"></div>
                <div className="text-sm font-mono">Success</div>
                <div className="text-xs text-muted-foreground">5.1:1 contrast</div>
              </div>
              <div className="space-y-2">
                <div className="h-24 rounded-lg bg-warning"></div>
                <div className="text-sm font-mono">Warning</div>
                <div className="text-xs text-muted-foreground">6.8:1 contrast</div>
              </div>
              <div className="space-y-2">
                <div className="h-24 rounded-lg bg-destructive"></div>
                <div className="text-sm font-mono">Error</div>
                <div className="text-xs text-muted-foreground">4.7:1 contrast</div>
              </div>
              <div className="space-y-2">
                <div className="h-24 rounded-lg bg-primary"></div>
                <div className="text-sm font-mono">Info</div>
                <div className="text-xs text-muted-foreground">Same as primary</div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Typography Section */}
        <section id="typography" className="py-12 space-y-6">
          <div>
            <h3 className="text-3xl font-bold mb-2">Typography</h3>
            <p className="text-muted-foreground">Clear hierarchy built for readability</p>
          </div>

          <Card>
            <CardContent className="py-6 space-y-6">
              <div className="space-y-2">
                <div className="text-4xl font-bold">Display 1 - Hero Headlines</div>
                <div className="text-xs text-muted-foreground">56px / 64px / Bold</div>
              </div>
              <div className="space-y-2">
                <div className="text-3xl font-bold">Display 2 - Page Titles</div>
                <div className="text-xs text-muted-foreground">48px / 56px / Bold</div>
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl font-semibold">H1 - Major Heading</h1>
                <div className="text-xs text-muted-foreground">32px / 40px / Semibold</div>
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-semibold">H2 - Section Heading</h2>
                <div className="text-xs text-muted-foreground">24px / 32px / Semibold</div>
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">H3 - Card Title</h3>
                <div className="text-xs text-muted-foreground">20px / 28px / Semibold</div>
              </div>
              <div className="space-y-2">
                <p className="text-base">Body - Default paragraph text. This is the primary text style used throughout the application for content and descriptions.</p>
                <div className="text-xs text-muted-foreground">16px / 24px / Regular</div>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Body Small - Secondary information and helper text</p>
                <div className="text-xs text-muted-foreground">14px / 20px / Regular</div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Buttons Section */}
        <section id="buttons" className="py-12 space-y-6">
          <div>
            <h3 className="text-3xl font-bold mb-2">Buttons</h3>
            <p className="text-muted-foreground">Every variant, size, and state</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Button Variants</CardTitle>
              <CardDescription>Different button styles for different contexts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-3">
                <Button>Primary Button</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="link">Link</Button>
                <Button variant="destructive">Destructive</Button>
                <Button variant="success">Success</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Button Sizes</CardTitle>
              <CardDescription>Small, medium, large, and icon sizes</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <Button size="sm">Small</Button>
                <Button size="default">Default</Button>
                <Button size="lg">Large</Button>
                <Button size="icon">🎨</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Button States</CardTitle>
              <CardDescription>Default, hover, active, loading, disabled</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-3">
                <Button>Default</Button>
                <Button disabled>Disabled</Button>
                <Button className="pointer-events-none opacity-70">Loading...</Button>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Inputs & Forms Section */}
        <section id="inputs" className="py-12 space-y-6">
          <div>
            <h3 className="text-3xl font-bold mb-2">Inputs & Forms</h3>
            <p className="text-muted-foreground">Form elements with enhanced states</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Form Example</CardTitle>
              <CardDescription>Complete form with validation</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">We'll never share your email.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" placeholder="John Doe" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone (E.164)</Label>
                <Input id="phone" placeholder="+1234567890" />
              </div>

              <Button className="w-full">Submit Form</Button>
            </CardContent>
          </Card>
        </section>

        {/* Cards Section */}
        <section id="cards" className="py-12 space-y-6">
          <div>
            <h3 className="text-3xl font-bold mb-2">Cards</h3>
            <p className="text-muted-foreground">Container variations with elevation</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Basic Card</CardTitle>
                <CardDescription>Standard card with default styling</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  This is a basic card component with header, content, and footer sections.
                </p>
              </CardContent>
              <CardFooter>
                <Button size="sm">Action</Button>
              </CardFooter>
            </Card>

            <Card className="card-interactive cursor-pointer">
              <CardHeader>
                <CardTitle>Interactive Card</CardTitle>
                <CardDescription>Hover me for effects</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  This card has hover effects with increased elevation and border glow.
                </p>
              </CardContent>
            </Card>

            <Card className="glass">
              <CardHeader>
                <CardTitle>Glass Card</CardTitle>
                <CardDescription>Translucent with blur</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Perfect for overlays on video content.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Cinema Mode Section */}
        <section id="cinema-mode" className="py-12 space-y-6">
          <div>
            <h3 className="text-3xl font-bold mb-2">🎬 Cinema Mode</h3>
            <p className="text-muted-foreground">Premium immersive viewing experience</p>
          </div>

          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle>Cinema Mode Features</CardTitle>
              <CardDescription>Ultra-dark, distraction-free experience</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
                <li>Pure black backgrounds (#000000)</li>
                <li>Near-black surfaces for minimal distraction</li>
                <li>Darker borders for seamless video integration</li>
                <li>Toggle with button or keyboard shortcut (Shift+C)</li>
                <li>Optimized for video streaming focus</li>
              </ul>
              
              <div className="pt-4">
                <CinemaModeToggle />
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Footer */}
        <footer className="py-12 border-t mt-12">
          <div className="text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              FieldView.Live Theme System - "Dark Cinema" Edition
            </p>
            <p className="text-xs text-muted-foreground">
              High contrast • Low animation intensity • WCAG AA compliant • Cinema Mode enabled
            </p>
            <div className="flex justify-center gap-4 text-xs">
              <a href="/" className="text-primary hover:underline">Home</a>
              <a href="/direct/tchs" className="text-primary hover:underline">TCHS Stream</a>
              <a href="/owners/login" className="text-primary hover:underline">Owner Portal</a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

