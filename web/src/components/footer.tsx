import { Wand2 } from "lucide-react";
import Link from "next/link"; // Assuming you're using Next.js; remove if not

export function Footer() {
  return (
    <footer className="border-t py-4 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-center text-center space-y-4">
          <div className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-primary" />
            <span className="font-semibold">Nexus-Flow</span>
          </div>

          {/* Social Links */}
          <div className="flex space-x-6">
            <Link
              href="https://github.com/im-subhadeep/Xeno-Assignment"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              GitHub
            </Link>
            <Link
              href="https://www.linkedin.com/in/subhadeep-mondal-8090b222b/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              LinkedIn
            </Link>
            <Link
              href="https://x.com/im_subhadeep_"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              Twitter
            </Link>
          </div>

          <div className="text-sm text-muted-foreground">
            Powered by Groq API (Fast AI Inference) • © {new Date().getFullYear()} Nexus-Flow • Made with ❤️ by Subhadeep Mondal
          </div>
        </div>
      </div>
    </footer>
  );
} 