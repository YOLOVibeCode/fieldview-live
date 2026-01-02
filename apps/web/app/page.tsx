import Link from 'next/link';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-5xl font-bold tracking-tight mb-4" data-testid="heading-hero">
          FieldView.Live
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-12">
          Monetization platform for youth sports live streaming. Create stable watch links, share with your audience,
          and stream your games.
        </p>

        {/* Two Panels */}
        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto mb-16">
          {/* Individual Panel */}
          <Card
            className="hover:shadow-lg transition-shadow border-2 hover:border-primary/50"
            data-testid="card-individual"
          >
            <CardHeader>
              <CardTitle className="text-2xl">Individual</CardTitle>
              <CardDescription className="text-base">For Parents & Coaches</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Share a stable link to your stream. Perfect for a single team or group—update the stream source
                anytime without changing the link.
              </p>
              <div className="text-left space-y-2">
                <p className="text-sm font-semibold">Quick steps:</p>
                <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-1">
                  <li>Create your creator account</li>
                  <li>Create a stable watch link</li>
                  <li>Paste your Mux or HLS stream URL</li>
                  <li>Share the link with your audience</li>
                </ol>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-3">
              <Link href="/owners/register?type=individual" className="w-full">
                <Button className="w-full" size="lg" data-testid="btn-get-started-individual">
                  Get started (Individual)
                </Button>
              </Link>
              <p className="text-sm text-muted-foreground">
                Already have an account?{' '}
                <Link href="/owners/login" className="text-primary underline" data-testid="link-signin-individual">
                  Sign in
                </Link>
              </p>
            </CardFooter>
          </Card>

          {/* Organization Panel */}
          <Card
            className="hover:shadow-lg transition-shadow border-2 hover:border-primary/50"
            data-testid="card-organization"
          >
            <CardHeader>
              <CardTitle className="text-2xl">School / Club</CardTitle>
              <CardDescription className="text-base">For Organizations & Associations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Create stable org/team links you can reuse all season. Manage multiple teams under one organization
                with persistent URLs.
              </p>
              <div className="text-left space-y-2">
                <p className="text-sm font-semibold">Quick steps:</p>
                <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-1">
                  <li>Create your organization account</li>
                  <li>Create stable team links</li>
                  <li>Update stream sources anytime</li>
                  <li>Share links with families</li>
                </ol>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-3">
              <Link href="/owners/register?type=association" className="w-full">
                <Button className="w-full" size="lg" data-testid="btn-get-started-organization">
                  Get started (Organization)
                </Button>
              </Link>
              <p className="text-sm text-muted-foreground">
                Already have an account?{' '}
                <Link href="/owners/login" className="text-primary underline" data-testid="link-signin-organization">
                  Sign in
                </Link>
              </p>
            </CardFooter>
          </Card>
        </div>

        {/* Public Footer (Viewer Section) */}
        <div className="max-w-3xl mx-auto">
          <Card className="bg-secondary/30 border-dashed" data-testid="card-watch-stream">
            <CardHeader>
              <CardTitle className="text-xl">Watch a Stream</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                If you were given a watch link, open it directly. Watch links look like:{' '}
                <code className="bg-muted px-2 py-1 rounded text-xs">
                  fieldview.live/watch/ORG/TEAM
                </code>
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                No signup required to watch—just click the link shared by your team or organization.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
