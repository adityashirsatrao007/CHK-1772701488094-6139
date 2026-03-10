import { useNavigate } from "react-router-dom";
import { Button, Card, CardBody } from "@nextui-org/react";
import { motion } from "framer-motion";
import NavBar from "../components/NavBar";
import Court3D from "../components/Court3D";

function LandingPage() {
  const navigate = useNavigate();

  const features = [
    {
      icon: "📜",
      title: "FIR Semantic Extraction",
      description: "Extract active entities and legal premises automatically from scanned FIR documents using proprietary OCR architectures.",
    },
    {
      icon: "🔍",
      title: "Multimedia Verification",
      description: "Perform forensic-grade validation to detect deepfakes, spatial splicing, and audio manipulation in submitted evidence.",
    },
    {
      icon: "⚖️",
      title: "Statutory Mapping",
      description: "Algorithmically synthesize events mapping directly to the Indian Penal Code (IPC) and Bharatiya Nyaya Sanhita (BNS).",
    },
    {
      icon: "🏛️",
      title: "NCRB Integration",
      description: "Directly contextualize incident reports against official National Crime Records Bureau statistics.",
    },
    {
      icon: "🔐",
      title: "Cryptographic Privacy",
      description: "Strict isolation of sensitive files with end-to-end cryptographic hashing to ensure chain of custody.",
    },
    {
      icon: "🖋️",
      title: "Dossier Synthesis",
      description: "Instantly produce court-ready summary reports designed for seamless admission by legal counsels.",
    },
  ];

  return (
    <div className="min-h-screen bg-[#0c0a09] text-stone-300 relative font-sans selection:bg-amber-500 selection:text-black">
      <NavBar />

      {/* Hero Section */}
      <section className="pt-40 pb-20 px-4 relative z-10 flex flex-col items-center justify-center min-h-screen">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10 pointer-events-none"></div>
        <div className="max-w-7xl mx-auto text-center flex flex-col items-center">

          {/* Dynamic 3D Scale Component */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            className="w-full max-w-[600px] h-[350px] mx-auto mb-2 relative z-20"
          >
            <Court3D className="w-full h-full cursor-grab active:cursor-grabbing" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="relative z-30"
          >
            <div className="inline-flex items-center gap-3 bg-[#1c1917] border border-stone-800 rounded-sm px-6 py-2 mb-8 shadow-2xl">
              <span className="w-2 h-2 bg-amber-500 animate-pulse"></span>
              <span className="text-sm text-stone-400 font-semibold uppercase tracking-widest">
                AI-Intelligence for the Justice System
              </span>
            </div>

            <h2 className="text-6xl md:text-8xl font-black font-serif text-white mb-6 leading-tight tracking-tight">
              Nyaya <span className="text-amber-600">AI</span>
            </h2>
            <p className="text-xl md:text-2xl text-stone-400 max-w-3xl mx-auto mb-6 font-serif italic border-l-4 border-amber-600 pl-4 py-2 bg-[#1c1917]/50 rounded-r-md">
              "Veritas Et Aequitas" — Truth and Equity through Computation.
            </p>
            <p className="text-base md:text-lg text-stone-500 max-w-2xl mx-auto mb-12 leading-relaxed tracking-wide">
              Transform the processing of judicial evidence. Utilize proprietary deep learning models for instant FIR analysis, deepfake detection, and automated statutory extraction catered specifically to Indian Jurisprudence.
            </p>

            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <Button
                size="lg"
                className="bg-amber-600 text-white font-bold text-lg px-10 py-7 hover:bg-amber-500 border border-amber-500/50 rounded-sm transition-all"
                onPress={() => navigate("/signup")}
                endContent={<span className="text-amber-200 ml-2">→</span>}
              >
                Access Platform
              </Button>
              <Button
                size="lg"
                variant="bordered"
                className="font-bold text-lg px-10 py-7 border-2 border-stone-700 text-stone-300 hover:bg-stone-800 rounded-sm transition-all"
                onPress={() => navigate("/login")}
              >
                Judicial Login
              </Button>
            </div>
          </motion.div>

          {/* Stats Bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="mt-32 grid grid-cols-2 md:grid-cols-4 gap-12 border-t border-b border-stone-800 py-16 w-full max-w-5xl mx-auto bg-[#131110]"
          >
            {[
              { value: "99.5%", label: "OCR Accuracy" },
              { value: "IPC/BNS", label: "Statutory Coverage" },
              { value: "< 2s", label: "Pipeline Latency" },
              { value: "Secure", label: "Encrypted Custody" },
            ].map((stat, idx) => (
              <div key={idx} className="text-center px-4 border-r last:border-0 border-stone-800">
                <p className="text-4xl md:text-5xl font-black font-serif text-amber-500 mb-2 tracking-tighter">
                  {stat.value}
                </p>
                <p className="text-xs font-bold text-stone-500 uppercase tracking-widest">{stat.label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Tailored Audience Section */}
      <section className="py-32 px-6 bg-[#131110] border-t border-b border-stone-800">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <h2 className="text-4xl md:text-5xl font-bold font-serif text-white mb-6">
              Empowering Every Pillar of Justice
            </h2>
            <p className="text-lg text-stone-500 max-w-2xl mx-auto">
              Our architecture is distinctly partitioned to serve the unique operational requirements of India's legal machinery.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="bg-[#1c1917] border border-stone-800 hover:border-amber-600/50 rounded-sm transition-colors">
              <CardBody className="p-10 text-center">
                <div className="text-5xl mb-6">🏛️</div>
                <h3 className="text-2xl font-bold font-serif text-white mb-3">Judiciary</h3>
                <p className="text-stone-400 leading-relaxed text-sm">
                  Accelerate case backlogs with instantly summarized dossiers, verified evidence flagging, and synthesized legal precedents ready for the bench.
                </p>
              </CardBody>
            </Card>
            <Card className="bg-[#1c1917] border border-stone-800 hover:border-amber-600/50 rounded-sm transition-colors xl:-translate-y-4">
              <CardBody className="p-10 text-center">
                <div className="text-5xl mb-6">🚨</div>
                <h3 className="text-2xl font-bold font-serif text-white mb-3">Law Enforcement</h3>
                <p className="text-stone-400 leading-relaxed text-sm">
                  Upload raw FIR inputs to instantly map statements to complex IPC/BNS statutes, filtering out manipulated multimedia evidence in active investigations.
                </p>
              </CardBody>
            </Card>
            <Card className="bg-[#1c1917] border border-stone-800 hover:border-amber-600/50 rounded-sm transition-colors">
              <CardBody className="p-10 text-center">
                <div className="text-5xl mb-6">⚖️</div>
                <h3 className="text-2xl font-bold font-serif text-white mb-3">Legal Counsels</h3>
                <p className="text-stone-400 leading-relaxed text-sm">
                  Strengthen defense or prosecution strategy using our AI-driven forensic analysis summaries and objective statutory context references.
                </p>
              </CardBody>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-32 px-6 relative bg-[#0c0a09]">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-24"
          >
            <h2 className="text-4xl md:text-5xl font-bold font-serif text-white mb-4">
              Comprehensive Platform Capabilities
            </h2>
            <div className="w-24 h-1.5 bg-amber-600 mx-auto rounded-sm mt-8"></div>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {features.map((feature, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                viewport={{ once: true }}
              >
                <div className="group h-full p-8 rounded-sm bg-[#131110] border border-stone-800 hover:border-amber-500 transition-all duration-300 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-amber-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <span className="text-4xl mb-6 block p-4 bg-[#1c1917] rounded-sm w-fit group-hover:bg-[#292524] transition-colors border border-stone-800">{feature.icon}</span>
                  <h3 className="text-xl font-bold font-serif text-white mb-4 tracking-wide">{feature.title}</h3>
                  <p className="text-stone-400 leading-relaxed text-sm">
                    {feature.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 px-6 bg-amber-700 relative overflow-hidden">
        {/* Geometric subtle overlay */}
        <div className="absolute inset-0 opacity-10 bg-[url('data:image/svg+xml,%3Csvg width=\'20\' height=\'20\' viewBox=\'0 0 20 20\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%23000000\' fill-opacity=\'1\' fill-rule=\'evenodd\'%3E%3Cpath d=\'M0 0h2v2H0V0zm10 10h2v2h-2v-2z\'/%3E%3C/g%3E%3C/svg%3E')]"></div>

        <div className="max-w-4xl mx-auto relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-6xl font-black font-serif mb-8 text-white tracking-tighter">
              Instituting Trust in Evidence.
            </h2>
            <p className="text-xl text-amber-100 mb-12 max-w-2xl mx-auto font-medium leading-relaxed">
              Equip your precinct or chambers with state-of-the-art computational forensics today. Registration is secured and verified.
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <Button
                size="lg"
                className="bg-[#0c0a09] text-white font-bold text-lg px-12 py-8 rounded-sm hover:scale-105 transition-transform"
                onPress={() => navigate("/signup")}
              >
                Request Authorization
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 bg-[#0c0a09] border-t border-stone-800">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3">
            <span className="text-2xl opacity-80">⚖️</span>
            <span className="font-bold font-serif text-xl tracking-wide text-white">Nyaya AI</span>
          </div>
          <p className="text-sm font-medium text-stone-500">
            © 2026 Developed for the Republic of India. All rights reserved.
          </p>
          <div className="flex gap-8 text-stone-400 text-sm font-semibold uppercase tracking-wider">
            <a href="#" className="hover:text-amber-500 transition-colors">Integrity</a>
            <a href="#" className="hover:text-amber-500 transition-colors">Jurisdiction</a>
            <a href="#" className="hover:text-amber-500 transition-colors">Press</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
