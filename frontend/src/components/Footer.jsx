import { Link } from "@nextui-org/react";

export default function Footer() {
    const yr = new Date().getFullYear();
    
    return (
        <footer className="bg-stone-900 text-stone-300 py-16 border-t-[8px] border-amber-800">
            <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-12">
                <div className="md:col-span-1">
                    <div className="flex items-center gap-2 mb-6">
                        <span className="text-3xl">⚖️</span>
                        <span className="text-2xl font-bold text-stone-100 tracking-tight">Nyaya AI</span>
                    </div>
                    <p className="text-sm text-stone-400 leading-relaxed max-w-xs">
                        Empowering the Indian judicial system with advanced AI for multimodal evidence analysis and FIR processing.
                    </p>
                </div>

                <div>
                    <h4 className="text-stone-100 font-semibold mb-6 tracking-wider uppercase text-sm border-b border-stone-800 pb-2 inline-block">Platform</h4>
                    <ul className="space-y-4 text-sm font-medium">
                        <li><Link href="/app" className="text-stone-400 hover:text-amber-500 transition-colors">Nyaya AI Dashboard</Link></li>
                        <li><Link href="#features" className="text-stone-400 hover:text-amber-500 transition-colors">Key Features</Link></li>
                        <li><Link href="#roles" className="text-stone-400 hover:text-amber-500 transition-colors">User Roles</Link></li>
                        <li><Link href="#" className="text-stone-400 hover:text-amber-500 transition-colors">Security Overview</Link></li>
                    </ul>
                </div>

                <div>
                    <h4 className="text-stone-100 font-semibold mb-6 tracking-wider uppercase text-sm border-b border-stone-800 pb-2 inline-block">Resources</h4>
                    <ul className="space-y-4 text-sm font-medium">
                        <li><Link href="#" className="text-stone-400 hover:text-amber-500 transition-colors">Documentation</Link></li>
                        <li><Link href="#" className="text-stone-400 hover:text-amber-500 transition-colors">API Integration</Link></li>
                        <li><Link href="#" className="text-stone-400 hover:text-amber-500 transition-colors">Legal Frameworks</Link></li>
                        <li><Link href="#" className="text-stone-400 hover:text-amber-500 transition-colors">Research Papers</Link></li>
                    </ul>
                </div>

                <div>
                    <h4 className="text-stone-100 font-semibold mb-6 tracking-wider uppercase text-sm border-b border-stone-800 pb-2 inline-block">Legal</h4>
                    <ul className="space-y-4 text-sm font-medium">
                        <li><Link href="#" className="text-stone-400 hover:text-amber-500 transition-colors">Terms of Service</Link></li>
                        <li><Link href="#" className="text-stone-400 hover:text-amber-500 transition-colors">Privacy Policy</Link></li>
                        <li><Link href="#" className="text-stone-400 hover:text-amber-500 transition-colors">Data Processing Addendum</Link></li>
                        <li><Link href="#" className="text-stone-400 hover:text-amber-500 transition-colors">Compliance</Link></li>
                    </ul>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-6 mt-16 pt-8 border-t border-stone-800 flex flex-col md:flex-row items-center justify-between text-xs text-stone-500">
                <p>&copy; {yr} Nyaya AI Network. All rights reserved.</p>
                <div className="flex gap-6 mt-4 md:mt-0 font-medium">
                    <span>In service of Indian Justice</span>
                    <span className="text-stone-700">|</span>
                    <span>Made in India</span>
                </div>
            </div>
        </footer>
    );
}
