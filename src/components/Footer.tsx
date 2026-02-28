import Link from "next/link";

/**
 * Footer Component
 * 
 * Renders the global footer section at the bottom of the application.
 * Displays static company information, copyright details, and external links.
 * 
 * @returns React Server Component for the application footer.
 */
export default function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="border-t border-border bg-background py-8 transition-colors duration-300">
            <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-4 text-center sm:flex-row sm:text-left">
                <div className="flex flex-col gap-1">
                    <span className="text-sm font-semibold text-foreground">
                        Amcap Business Consulting Private Limited
                    </span>
                    <span className="text-xs text-muted-foreground">
                        No.804, 772/A, B&apos; Block, 3rd Stage, Vijayanagar
                    </span>
                    <span className="text-xs text-muted-foreground">
                        570017 - Mysore, India
                    </span>
                </div>
                <div className="flex flex-col items-center gap-2 sm:items-end">
                    <span className="text-xs text-muted-foreground">
                        &copy; {currentYear} Amcap Business Consulting. All rights reserved.
                    </span>
                    <div className="flex gap-4 text-xs text-muted-foreground">
                        <Link href="https://amcapbizcon.com/about-us" className="hover:text-foreground transition-colors" target="_blank" rel="noopener noreferrer">
                            About Us
                        </Link>
                        <Link href="https://amcapbizcon.com/contactus" className="hover:text-foreground transition-colors" target="_blank" rel="noopener noreferrer">
                            Contact
                        </Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}
