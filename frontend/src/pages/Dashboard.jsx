import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import jsPDF from "jspdf";
import {
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Divider,
  Button,
  Tabs,
  Tab,
  Chip,
  Progress,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Avatar,
} from "@nextui-org/react";
import { motion, AnimatePresence } from "framer-motion";
import { logout, getCurrentUser } from "../services/auth";

function Dashboard() {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [cases, setCases] = useState([]);
  const [isLoadingCases, setIsLoadingCases] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [selectedCase, setSelectedCase] = useState(null);

  // Wizard State
  const [step, setStep] = useState(1);
  const [firFile, setFirFile] = useState(null);
  const [evidenceFile, setEvidenceFile] = useState(null);
  const [firResult, setFirResult] = useState(null);
  const [evidenceResult, setEvidenceResult] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressValue, setProgressValue] = useState(0);

  useEffect(() => {
    if (activeTab === "dashboard") {
      fetchCases();
    }
  }, [activeTab]);

  const fetchCases = async () => {
    setIsLoadingCases(true);
    setErrorMsg("");
    try {
      const userEmail = user?.email || "demo@nyaya.ai";
      const res = await fetch(`http://127.0.0.1:8000/cases?email=${encodeURIComponent(userEmail)}`);
      if (!res.ok) throw new Error(`HTTP status ${res.status}`);
      const data = await res.json();
      if (data && data.cases) {
        setCases(data.cases);
      } else {
        throw new Error("Invalid format: 'cases' array not found in response");
      }
    } catch (err) {
      console.error("Failed to fetch cases", err);
      setErrorMsg(`Failed to load cases: ${err.message}`);
      setCases([]);
    } finally {
      setIsLoadingCases(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const handleDragOver = (e) => e.preventDefault();

  const handleDropFir = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFirFile(e.dataTransfer.files[0]);
    }
  };

  const handleDropEvidence = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setEvidenceFile(e.dataTransfer.files[0]);
    }
  };

  const processFiles = async () => {
    if (!firFile) return;

    setIsProcessing(true);
    setStep(3);
    setProgressValue(0);

    // Simulate progress (calibrated for heavy OCR model extraction)
    const progressInterval = setInterval(() => {
      setProgressValue((v) => (v >= 90 ? 90 : v + 5));
    }, 1500);

    try {
      // 1. Process FIR
      const firData = new FormData();
      firData.append("file", firFile);
      firData.append("context", "fir");

      const firRes = await fetch("http://127.0.0.1:8000/analyze", {
        method: "POST",
        body: firData,
      });
      const firDataJson = await firRes.json();

      if (firDataJson.status === "error") {
        throw new Error(firDataJson.explanation || "Invalid Document Uploaded.");
      }

      setFirResult(firDataJson);

      // 2. Process Evidence (Optional)
      setProgressValue(50);

      let evDataJson = null;
      if (evidenceFile) {
        const evData = new FormData();
        evData.append("file", evidenceFile);
        evData.append("context", "evidence");

        const evRes = await fetch("http://127.0.0.1:8000/analyze", {
          method: "POST",
          body: evData,
        });
        evDataJson = await evRes.json();
        setEvidenceResult(evDataJson);
      } else {
        setEvidenceResult(null); // Clear previous if none selected
      }

      // 3. Save Case specifically for the logged in user
      const userEmail = user?.email || "demo@nyaya.ai";
      const newCase = {
        police_station: "Pending Review",
        date_filed: new Date().toISOString().split('T')[0],
        status: "Analyzed",
        analysis_progress: 100,
        tags: firDataJson.detected_ipcs || [],
        matches: firDataJson.detected_ipcs || [],
        fir_summary: firDataJson,
        evidence_analysis: evDataJson || null
      };

      try {
        await fetch(`http://127.0.0.1:8000/cases?email=${encodeURIComponent(userEmail)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newCase)
        });
        fetchCases(); // Refresh backend list in background
      } catch (err) {
        console.error("Failed to persist case to DB", err);
      }

      clearInterval(progressInterval);
      setProgressValue(100);

      setTimeout(() => {
        setStep(4);
      }, 500);
    } catch (error) {
      console.error("Analysis failed:", error);
      alert(error.message || "Failed to connect to the analysis server.");
      setStep(1); // Set step back to 1 for FIR error so they can re-upload
      clearInterval(progressInterval);
    } finally {
      setIsProcessing(false);
    }
  };

  const generatePDF = async () => {
    const pdf = new jsPDF();
    const fileToDataUrl = (file) =>
      new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(e);
        reader.readAsDataURL(file);
      });

    try {
      // Add Helper for Header & Footer
      const addBranding = (pageTitle) => {
        // Header
        pdf.setFillColor(245, 158, 11); // Amber-500
        pdf.rect(0, 0, 210, 15, "F");
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(14);
        pdf.setTextColor(255, 255, 255);
        pdf.text("Nyaya AI - Official Legal Analysis Report", 10, 10);

        pdf.setFontSize(10);
        pdf.setFont("helvetica", "normal");
        pdf.text(new Date().toLocaleDateString(), 180, 10);

        // Page Title below header
        pdf.setTextColor(0, 0, 0);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(16);
        pdf.text(pageTitle, 20, 30);

        // Footer
        const pageCount = pdf.internal.getNumberOfPages();
        pdf.setFont("helvetica", "italic");
        pdf.setFontSize(9);
        pdf.setTextColor(150, 150, 150);
        pdf.text(`Nyaya AI | Multimodal Evidence Analysis System | Page ${pageCount}`, 105, 290, null, null, "center");
        pdf.setTextColor(0, 0, 0); // Reset
      };

      // Page 1
      addBranding("Page 1: First Information Report (FIR)");

      pdf.setFont("helvetica", "normal");
      if (firFile && firFile.type.startsWith("image/")) {
        const firUrl = await fileToDataUrl(firFile);
        pdf.addImage(firUrl, "JPEG", 20, 40, 170, 200, undefined, "FAST");
      } else {
        pdf.setFontSize(12);
        pdf.text(
          `File attached: ${firFile?.name} (Preview not available)`,
          20,
          50,
        );
      }

      // Page 2: Evidence
      pdf.addPage();
      addBranding("Page 2: Multimodal Evidence");

      pdf.setFont("helvetica", "normal");
      if (evidenceFile && evidenceFile.type.startsWith("image/")) {
        const evUrl = await fileToDataUrl(evidenceFile);
        pdf.addImage(evUrl, "JPEG", 20, 40, 170, 150, undefined, "FAST");
      } else if (evidenceFile) {
        pdf.setFontSize(12);
        pdf.text(`Evidence File: ${evidenceFile.name}`, 20, 45);
      } else {
        // Evidence was skipped entirely in the flow
        pdf.setFontSize(14);
        pdf.setTextColor(150, 150, 150);
        pdf.text("(Evidence Upload Skipped / Not Provided)", 105, 140, null, null, "center");
        pdf.setTextColor(0, 0, 0); // Restore Black
      }

      // Page 3: Legal Analysis
      pdf.addPage();
      addBranding("Page 3: AI Legal Analysis & Insights");

      // Card-like background for FIR Extraction
      pdf.setFillColor(250, 250, 249); // stone-50
      pdf.setDrawColor(214, 211, 209); // stone-300
      pdf.roundedRect(15, 40, 180, 140, 3, 3, "FD");

      let y = 50;
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(14);
      pdf.setTextColor(180, 83, 9); // amber-700
      pdf.text("1. FIR Legal Extraction & Context:", 20, y);

      pdf.setTextColor(0, 0, 0);
      y += 10;
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(12);

      const ipcText = firResult.detected_ipcs?.length > 0 ? firResult.detected_ipcs.join(", ") : "None Detected";
      pdf.setFont("helvetica", "bold");
      pdf.text("Detected Statutes:", 20, y);
      pdf.setFont("helvetica", "normal");
      pdf.text(` ${ipcText}`, 65, y);

      y += 10;
      pdf.setFont("helvetica", "bold");
      pdf.text("Punishment Mapping / Summary:", 20, y);
      y += 7;
      pdf.setFont("helvetica", "normal");
      const firExplLines = pdf.splitTextToSize(firResult.explanation, 165);
      pdf.text(firExplLines, 20, y);
      y += firExplLines.length * 6 + 10;

      if (firResult.key_factors && firResult.key_factors.length > 0) {
        pdf.setFont("helvetica", "bold");
        pdf.text("Detailed Findings & Extracted Insights:", 20, y);
        y += 8;
        pdf.setFont("helvetica", "normal");

        firResult.key_factors.forEach((factor) => {
          const factorLines = pdf.splitTextToSize(`- ${factor}`, 165);

          if (y + factorLines.length * 6 > 270) {
            pdf.addPage();
            addBranding("AI Legal Analysis (Continued)");
            y = 40;
          }

          pdf.text(factorLines, 20, y);
          y += factorLines.length * 6 + 3;
        });
        y += 10;
      }

      // Evidence Integrity Block
      // Make sure it doesn't overflow page
      if (y > 240) {
        pdf.addPage();
        addBranding("AI Multimodal Analysis (Continued)");
        y = 40;
      }

      pdf.setFillColor(250, 250, 249);
      pdf.roundedRect(15, y - 5, 180, 60, 3, 3, "FD");

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(14);
      pdf.setTextColor(180, 83, 9);
      pdf.text("2. Evidence Integrity Analysis:", 20, y + 5);
      y += 15;
      pdf.setTextColor(0, 0, 0);

      if (evidenceResult) {
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(12);

        pdf.setFont("helvetica", "bold");
        pdf.text("Integrity Status:", 20, y);
        pdf.setFont("helvetica", "normal");

        const isTampered = evidenceResult.is_manipulated;
        if (isTampered) {
          pdf.setTextColor(220, 38, 38); // red
        } else {
          pdf.setTextColor(22, 163, 74); // green
        }

        const tamperingStatus = isTampered ? "[!] TAMPERING DETECTED" : "[OK] VERIFIED AUTHENTIC";
        pdf.text(`${tamperingStatus}  (Confidence: ${evidenceResult.confidence_score.toFixed(2)}%)`, 55, y);

        pdf.setTextColor(0, 0, 0);
        y += 10;
        const evExplLines = pdf.splitTextToSize(`Analysis: ${evidenceResult.explanation}`, 165);
        pdf.text(evExplLines, 20, y);

      } else {
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(12);
        pdf.setTextColor(150, 150, 150);
        pdf.text("(Skipped / Not Provided)", 20, y);
        pdf.setTextColor(0, 0, 0);
      }

      pdf.save(`NyayaAI_Report_${new Date().getTime()}.pdf`);
    } catch (err) {
      console.error(err);
      alert("Failed to generate PDF");
    }
  };

  const resetFlow = () => {
    setStep(1);
    setFirFile(null);
    setEvidenceFile(null);
    setFirResult(null);
    setEvidenceResult(null);
  };

  return (
    <div className="min-h-screen bg-background text-stone-900 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-stone-200 via-stone-50 to-stone-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* API Header */}
        <header className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4 pb-4 border-b border-stone-200">
          <div>
            <h1 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-amber-700 to-amber-900 tracking-tight flex items-center gap-2">
              <span>⚖️</span> Nyaya AI
            </h1>
            <p className="text-sm text-stone-600 mt-1 font-medium tracking-wide">
              Multimodal Evidence Analysis & Verification System
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Tabs
              key="navigation"
              color="warning"
              variant="bordered"
              selectedKey={activeTab}
              onSelectionChange={(k) => setActiveTab(k)}
            >
              <Tab
                key="dashboard"
                title={
                  <div className="flex items-center space-x-2">
                    <span>🗃️</span>
                    <span>Active Cases</span>
                  </div>
                }
              />
              <Tab
                key="new"
                title={
                  <div className="flex items-center space-x-2">
                    <span>➕</span>
                    <span>New Analysis</span>
                  </div>
                }
              />
            </Tabs>

            {/* User Menu */}
            <Dropdown placement="bottom-end">
              <DropdownTrigger>
                <Avatar
                  as="button"
                  className="transition-transform"
                  color="warning"
                  name={user?.name?.charAt(0) || "U"}
                  size="sm"
                  showFallback
                />
              </DropdownTrigger>
              <DropdownMenu aria-label="User Actions" variant="flat">
                <DropdownItem key="profile" className="h-14 gap-2" textValue="Profile">
                  <p className="font-semibold">Signed in as</p>
                  <p className="font-semibold text-amber-700">{user?.email || "user@nyaya.ai"}</p>
                </DropdownItem>
                <DropdownItem key="settings" textValue="Settings">Settings</DropdownItem>
                <DropdownItem key="help" textValue="Help">Help & Support</DropdownItem>
                <DropdownItem key="logout" color="danger" onPress={handleLogout} textValue="Logout">
                  Log Out
                </DropdownItem>
              </DropdownMenu>
            </Dropdown>
          </div>
        </header>

        <main>
          <AnimatePresence mode="wait">
            {/* --- DASHBOARD VIEW --- */}
            {activeTab === "dashboard" && (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                <div className="flex justify-between items-end mb-6">
                  <div>
                    <h2 className="text-2xl font-bold">
                      Crime & Criminal Network Database
                    </h2>
                    <p className="text-stone-600">
                      Viewing correlated FIRs and verified multimodal evidence.
                    </p>
                  </div>
                  <Chip
                    color="success"
                    variant="flat"
                    size="sm"
                    className="font-semibold tracking-widest pl-2"
                  >
                    <span className="w-2 h-2 rounded-full bg-success inline-block mr-2 animate-pulse"></span>
                    LIVE SYNC
                  </Chip>
                </div>

                {isLoadingCases ? (
                  <div className="flex flex-col items-center justify-center p-20 gap-4">
                    <Progress
                      size="sm"
                      isIndeterminate
                      color="warning"
                      className="max-w-md"
                    />
                    <p className="text-stone-600">
                      Fetching cases from secure server...
                    </p>
                  </div>
                ) : errorMsg ? (
                  <div className="flex flex-col items-center justify-center p-20 gap-4 bg-danger-50/10 border border-danger/30 rounded-xl mt-8">
                    <span className="text-4xl">⚠️</span>
                    <h3 className="text-xl font-bold text-danger">
                      Connection Error
                    </h3>
                    <p className="text-red-700 text-center max-w-lg">
                      {errorMsg}
                    </p>
                    <p className="text-sm text-stone-500 mt-2">
                      Please ensure the FastAPI backend is running on
                      http://127.0.0.1:8000
                    </p>
                    <Button
                      color="warning"
                      variant="flat"
                      onPress={fetchCases}
                      className="mt-4"
                    >
                      Retry Connection
                    </Button>
                  </div>
                ) : cases.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-20 gap-4 bg-white/80 shadow-md border border-stone-200 rounded-xl mt-8">
                    <span className="text-4xl">📭</span>
                    <p className="text-stone-500">
                      No cases found in the database.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {(cases || []).map((c, idx) => (
                      <Card
                        key={idx}
                        isPressable
                        onPress={() => {
                          setSelectedCase(c);
                          onOpen();
                        }}
                        className="bg-white/80 shadow-md backdrop-blur-md border border-stone-200 hover:-translate-y-1 transition-transform text-left w-full"
                        shadow="md"
                      >
                        <CardHeader className="flex justify-between items-center px-6 pt-6">
                          <div className="flex flex-col gap-1">
                            <span className="text-lg font-bold text-amber-700">
                              {c.case_id}
                            </span>
                            <span className="text-xs text-stone-500 font-mono">
                              {c.date_filed}
                            </span>
                          </div>
                          <Chip
                            color={
                              c.status.includes("Closed")
                                ? "success"
                                : "warning"
                            }
                            variant="flat"
                            size="sm"
                          >
                            {c.status}
                          </Chip>
                        </CardHeader>
                        <Divider className="bg-white/5" />
                        <CardBody className="px-6 py-4 flex flex-col gap-4">
                          {/* FIR Info */}
                          <div className="bg-stone-100 p-4 rounded-xl border border-stone-200 flex gap-4">
                            {c.fir_summary.image_url && (
                              <div className="w-1/3 flex-shrink-0">
                                <img
                                  src={c.fir_summary.image_url}
                                  alt="FIR Document"
                                  className="w-full h-32 object-cover rounded-lg border border-stone-200 opacity-80 hover:opacity-100 transition-opacity"
                                />
                              </div>
                            )}
                            <div className="flex-1 flex flex-col">
                              <div className="flex justify-between mb-2">
                                <span className="text-sm font-semibold text-amber-700">
                                  FIR OCR Extraction
                                </span>
                                <Chip
                                  size="sm"
                                  variant="faded"
                                  className="border-none bg-amber-100 text-amber-700"
                                >
                                  {Number(c.fir_summary.ocr_confidence || c.fir_summary.confidence_score || 0).toFixed(1)}% Conf
                                </Chip>
                              </div>
                              <div className="flex flex-wrap gap-1 mb-2">
                                {(c.fir_summary.detected_ipcs || []).map((ipc) => (
                                  <Chip
                                    key={ipc}
                                    size="sm"
                                    className="bg-default-100"
                                  >
                                    {ipc}
                                  </Chip>
                                ))}
                              </div>
                              <p className="text-xs text-stone-500 leading-relaxed line-clamp-3">
                                {c.fir_summary.charges_summary || c.fir_summary.explanation}
                              </p>
                            </div>
                          </div>

                          {/* Evidence Info */}
                          {c.evidence_analysis ? (
                            <div
                              className={`p-4 rounded-xl border ${c.evidence_analysis.is_manipulated
                                ? "bg-danger-50 flex-none border-danger/30"
                                : "bg-success-50 flex-none border-success/30"
                                }`}
                            >
                              <div className="flex justify-between items-center mb-2">
                                <span className={`text-sm font-semibold ${c.evidence_analysis.is_manipulated ? "text-danger-700" : "text-success-700"}`}>
                                  {c.evidence_analysis.is_manipulated ? "WARNING: Potential Tampering" : "Authentic Evidence"}
                                </span>
                                <span className={`text-xs font-bold font-mono ${c.evidence_analysis.is_manipulated ? "text-danger-600" : "text-success-600"}`}>
                                  {Number(c.evidence_analysis.confidence_score || 0).toFixed(1)}% Score
                                </span>
                              </div>
                              <p className={`text-xs line-clamp-2 ${c.evidence_analysis.is_manipulated ? "text-danger-800" : "text-success-800"}`}>
                                {c.evidence_analysis.explanation}
                              </p>
                            </div>
                          ) : (
                            <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 text-center">
                              <span className="text-sm font-semibold text-stone-500">
                                ⚪ Evidence Upload Skipped
                              </span>
                            </div>
                          )}
                        </CardBody>
                      </Card>
                    ))}
                  </div>
                )}

                {/* Modal for Case Details */}
                <Modal
                  isOpen={isOpen}
                  onOpenChange={onOpenChange}
                  size="3xl"
                  backdrop="blur"
                  scrollBehavior="inside"
                >
                  <ModalContent className="bg-white/95 border border-stone-200 shadow-2xl">
                    {(onClose) => (
                      <>
                        <ModalHeader className="flex flex-col gap-1 border-b border-stone-200 pb-4">
                          <h2 className="text-2xl font-bold text-amber-700 flex items-center gap-3">
                            <span className="text-3xl">🗃️</span> Case Profile:{" "}
                            {selectedCase?.case_id}
                          </h2>
                          <p className="text-sm text-stone-600">
                            Registered on {selectedCase?.date_filed} at{" "}
                            {selectedCase?.police_station || "Unknown PS"}
                          </p>
                        </ModalHeader>
                        <ModalBody className="py-6">
                          {selectedCase && (
                            <div className="flex flex-col gap-6 tracking-wide">
                              {/* Document Highlight */}
                              <div className="flex flex-col md:flex-row gap-6">
                                {selectedCase.fir_summary.image_url && (
                                  <a
                                    href={selectedCase.fir_summary.image_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    title="Click to view full FIR document"
                                    className="w-full md:w-1/2 rounded-xl overflow-hidden border border-stone-200 shadow-lg relative group cursor-pointer block"
                                  >
                                    <div className="absolute inset-0 bg-gradient-to-t from-stone-900/60 to-transparent pointer-events-none z-10"></div>
                                    <span className="absolute bottom-3 left-3 z-20 text-xs font-bold bg-stone-800/80 px-2 py-1 rounded backdrop-blur-md">
                                      FIR DOCUMENT SCAN
                                    </span>
                                    {/* Hover overlay */}
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-300 flex items-center justify-center z-20">
                                      <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-stone-900/90 text-white text-white text-xs px-3 py-1.5 rounded-full font-mono tracking-wider">
                                        🔍 CLICK TO VIEW FULL DOCUMENT
                                      </span>
                                    </div>
                                    <img
                                      src={selectedCase.fir_summary.image_url}
                                      alt="Original FIR"
                                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                    />
                                  </a>
                                )}

                                <div className="w-full md:w-1/2 flex flex-col gap-4">
                                  <div className="bg-amber-50/10 p-5 rounded-xl border border-amber-200">
                                    <h3 className="text-amber-700 font-bold mb-3 uppercase tracking-wider text-xs">
                                      AI Extraction Data
                                    </h3>
                                    <div className="flex flex-wrap gap-2 mb-4">
                                      {(selectedCase.fir_summary.detected_ipcs || []).map(
                                        (ipc) => (
                                          <Chip
                                            key={ipc}
                                            color="warning"
                                            variant="flat"
                                            size="sm"
                                            className="font-mono"
                                          >
                                            {ipc}
                                          </Chip>
                                        ),
                                      )}
                                    </div>
                                    <p className="text-sm text-stone-600 leading-relaxed font-sans">
                                      {selectedCase.fir_summary.charges_summary || selectedCase.fir_summary.explanation}
                                    </p>
                                    <div className="mt-4 flex justify-between items-center text-xs text-stone-600 border-t border-stone-200 pt-3">
                                      <span>OCR Confidence</span>
                                      <span className="text-amber-700 font-mono">
                                        {Number(selectedCase.fir_summary.ocr_confidence || selectedCase.fir_summary.confidence_score || 0).toFixed(1)}%
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Forensic Evidence Analysis full block */}
                              {selectedCase.evidence_analysis ? (
                                <div
                                  className={`mt-2 p-5 rounded-xl border ${selectedCase.evidence_analysis.is_manipulated ? "bg-red-50 border-danger/30" : "bg-emerald-50 border-success/30"}`}
                                >
                                  <h3
                                    className={`font-bold mb-4 uppercase tracking-wider text-xs ${selectedCase.evidence_analysis.is_manipulated ? "text-red-600" : "text-emerald-600"}`}
                                  >
                                    Forensic Authenticity Analysis:{" "}
                                    {selectedCase.evidence_analysis.evidence_type}
                                  </h3>
                                  <div className="flex flex-col md:flex-row items-center gap-6">
                                    {/* Actual Evidence Visual — click to open full-size */}
                                    <a
                                      href={
                                        selectedCase.evidence_analysis.image_url
                                      }
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      title="Click to view full evidence image"
                                      className="w-full md:w-1/3 h-48 rounded-xl bg-stone-200 border border-stone-200 flex items-center justify-center relative overflow-hidden group cursor-pointer flex-shrink-0"
                                    >
                                      <img
                                        src={
                                          selectedCase.evidence_analysis.image_url
                                        }
                                        alt="Forensic Evidence"
                                        className="absolute inset-0 w-full h-full object-cover opacity-85 group-hover:opacity-100 transition-all duration-300 group-hover:scale-105"
                                      />
                                      {/* Hover overlay */}
                                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-300 flex items-center justify-center z-10">
                                        <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-stone-900/90 text-white text-white text-xs px-3 py-1.5 rounded-full font-mono tracking-wider">
                                          🔍 CLICK TO OPEN FULL SIZE
                                        </span>
                                      </div>
                                      {/* Evidence Type Icon */}
                                      <div className="absolute top-2 right-2 bg-stone-900/90 text-white p-1.5 rounded-md backdrop-blur-md z-10">
                                        {selectedCase.evidence_analysis.evidence_type.includes(
                                          "Video",
                                        ) && <span className="text-xl">🎞️</span>}
                                        {selectedCase.evidence_analysis.evidence_type.includes(
                                          "Audio",
                                        ) && <span className="text-xl">🎙️</span>}
                                        {selectedCase.evidence_analysis.evidence_type.includes(
                                          "Image",
                                        ) && <span className="text-xl">🖼️</span>}
                                      </div>
                                      {/* Tamper Overlay */}
                                      {selectedCase.evidence_analysis
                                        .is_manipulated && (
                                          <div className="absolute inset-0 border-2 border-danger/80 rounded-xl pointer-events-none z-10"></div>
                                        )}
                                    </a>

                                    <div className="flex-1 flex items-center gap-6">
                                      <div className="text-center w-32">
                                        <Chip
                                          color={
                                            selectedCase.evidence_analysis
                                              .is_manipulated
                                              ? "danger"
                                              : "success"
                                          }
                                          variant="shadow"
                                          size="lg"
                                          className="px-4 font-black tracking-widest"
                                        >
                                          {selectedCase.evidence_analysis
                                            .is_manipulated
                                            ? "TAMPERED"
                                            : "VERIFIED"}
                                        </Chip>
                                        <p className="text-xs text-stone-500 mt-2 font-mono">
                                          {
                                            selectedCase.evidence_analysis
                                              .confidence_score
                                          }
                                          % Conf
                                        </p>
                                      </div>
                                      <Divider
                                        orientation="vertical"
                                        className="h-16 bg-white/10 hidden md:block"
                                      />
                                      <p
                                        className={`text-sm leading-relaxed flex-1 ${selectedCase.evidence_analysis.is_manipulated ? "text-red-600" : "text-emerald-600"}`}
                                      >
                                        {
                                          selectedCase.evidence_analysis
                                            .explanation
                                        }
                                      </p>
                                    </div>

                                    {/* NCRB Official Statistics Context */}
                                    {selectedCase.evidence_analysis.ncrb_context
                                      ?.stat_value && (
                                        <div className="mt-4 p-3 rounded-lg bg-white/5 border border-amber-200 flex items-start gap-3">
                                          <div className="text-2xl mt-0.5">🏛️</div>
                                          <div>
                                            <p className="text-[10px] uppercase tracking-widest text-amber-700 font-bold mb-1">
                                              NCRB Official Data — National Context
                                            </p>
                                            <p className="text-sm text-stone-600">
                                              <span className="font-mono text-amber-700 text-base font-bold">
                                                {
                                                  selectedCase.evidence_analysis
                                                    .ncrb_context.stat_value
                                                }
                                              </span>{" "}
                                              cases of this type registered in West
                                              Bengal alone.{" "}
                                              <span className="text-stone-500">
                                                (National total:{" "}
                                                <span className="font-mono">
                                                  {
                                                    selectedCase.evidence_analysis
                                                      .ncrb_context.national_total
                                                  }
                                                </span>
                                                )
                                              </span>
                                            </p>
                                            <p className="text-[10px] text-stone-600 mt-1 italic">
                                              Source:{" "}
                                              {
                                                selectedCase.evidence_analysis
                                                  .ncrb_context.source
                                              }
                                            </p>
                                          </div>
                                        </div>
                                      )}
                                  </div>
                                </div>
                              ) : null}
                            </div>
                          )}
                        </ModalBody>
                        <ModalFooter className="border-t border-stone-200 pt-4">
                          <Button
                            color="default"
                            variant="light"
                            onPress={onClose}
                          >
                            Close Profile
                          </Button>
                          <Button
                            color="warning"
                            variant="shadow"
                            onPress={() => {
                              /* Placeholder for future action like "Download PDF" */
                              alert(
                                "Printing full dossier is not implemented yet in the hybrid build.",
                              );
                            }}
                          >
                            Print Full Dossier
                          </Button>
                        </ModalFooter>
                      </>
                    )}
                  </ModalContent>
                </Modal>
              </motion.div>
            )}

            {/* --- NEW ANALYSIS WIZARD --- */}
            {activeTab === "new" && (
              <motion.div
                key="new"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="max-w-4xl mx-auto"
              >
                {/* Stepper Header */}
                <div className="flex justify-between mb-8 px-4 relative">
                  <div className="absolute top-1/2 left-0 w-full h-[2px] bg-default-200 -z-10 -translate-y-1/2" />
                  {[
                    "FIR Upload",
                    "Evidence Upload",
                    "AI Processing",
                    "Final Report",
                  ].map((label, idx) => {
                    const isActive = step >= idx + 1;
                    const isCurrent = step === idx + 1;
                    return (
                      <div
                        key={idx}
                        className="flex flex-col items-center gap-2 bg-background px-2"
                      >
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ${isActive
                            ? "bg-amber-500 text-white shadow-[0_0_15px_rgba(245,158,11,0.5)]"
                            : "bg-default-100 text-stone-500 border-2 border-default-200"
                            } ${isCurrent ? "scale-110" : "scale-100"}`}
                        >
                          {isActive && !isCurrent ? "✓" : idx + 1}
                        </div>
                        <span
                          className={`text-xs font-semibold ${isActive ? "text-amber-700" : "text-stone-500"}`}
                        >
                          {label}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <AnimatePresence mode="wait">
                  {/* STEP 1: FIR Upload */}
                  {step === 1 && (
                    <motion.div
                      key="step1"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                    >
                      <Card
                        className="bg-default-50/20 backdrop-blur-lg border border-stone-200"
                        shadow="lg"
                      >
                        <CardHeader className="flex flex-col items-start px-8 pt-8">
                          <h2 className="text-2xl font-bold">
                            Step 1: First Information Report (FIR)
                          </h2>
                          <p className="text-stone-600 mt-2">
                            Upload the scanned FIR document to extract relevant
                            IPC codes using OCR and YOLOv8.
                          </p>
                        </CardHeader>
                        <CardBody className="px-8 py-6">
                          <div
                            onDragOver={handleDragOver}
                            onDrop={handleDropFir}
                            className="border-2 border-dashed border-amber-500/50 hover:border-amber-500/80 transition-colors bg-amber-500/5 rounded-2xl p-12 flex flex-col items-center justify-center gap-4 cursor-pointer"
                            onClick={() =>
                              document.getElementById("fir-upload").click()
                            }
                          >
                            <span className="text-5xl">📄</span>
                            <div className="text-center">
                              <h3 className="text-xl font-semibold">
                                Drag & Drop FIR Document
                              </h3>
                              <p className="text-sm text-stone-500 mt-1">
                                Images or PDFs Supported
                              </p>
                            </div>
                            <Button
                              color="warning"
                              variant="flat"
                              className="mt-2 font-semibold"
                            >
                              Browse Files
                            </Button>
                            <input
                              type="file"
                              id="fir-upload"
                              className="hidden"
                              onChange={(e) => setFirFile(e.target.files[0])}
                            />
                          </div>
                        </CardBody>
                        <CardFooter className="px-8 pb-8 justify-between">
                          <div className="flex-1">
                            {firFile && (
                              <Chip color="success" variant="flat" size="lg">
                                Selected: {firFile.name}
                              </Chip>
                            )}
                          </div>
                          <Button
                            color="warning"
                            variant="shadow"
                            isDisabled={!firFile}
                            onClick={() => setStep(2)}
                            endContent={<span>➔</span>}
                          >
                            Next Step
                          </Button>
                        </CardFooter>
                      </Card>
                    </motion.div>
                  )}

                  {/* STEP 2: Evidence Upload */}
                  {step === 2 && (
                    <motion.div
                      key="step2"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                    >
                      <Card
                        className="bg-default-50/20 backdrop-blur-lg border border-stone-200"
                        shadow="lg"
                      >
                        <CardHeader className="flex flex-col items-start px-8 pt-8">
                          <h2 className="text-2xl font-bold">
                            Step 2: Digital Evidence
                          </h2>
                          <p className="text-stone-600 mt-2">
                            Upload corresponding video, audio, or image evidence
                            for forensic authenticity checking.
                          </p>
                        </CardHeader>
                        <CardBody className="px-8 py-6">
                          <div
                            onDragOver={handleDragOver}
                            onDrop={handleDropEvidence}
                            className="border-2 border-dashed border-secondary/50 hover:border-secondary/80 transition-colors bg-secondary/5 rounded-2xl p-12 flex flex-col items-center justify-center gap-4 cursor-pointer"
                            onClick={() =>
                              document.getElementById("evidence-upload").click()
                            }
                          >
                            <span className="text-5xl">🔍</span>
                            <div className="text-center">
                              <h3 className="text-xl font-semibold">
                                Drag & Drop Evidence File
                              </h3>
                              <p className="text-sm text-stone-500 mt-1">
                                Video (Deepfake), Audio (Spoof), Image
                                (Manipulation)
                              </p>
                            </div>
                            <Button
                              color="secondary"
                              variant="flat"
                              className="mt-2 font-semibold"
                            >
                              Browse Evidence
                            </Button>
                            <input
                              type="file"
                              id="evidence-upload"
                              className="hidden"
                              onChange={(e) =>
                                setEvidenceFile(e.target.files[0])
                              }
                            />
                          </div>
                        </CardBody>
                        <CardFooter className="px-8 pb-8 flex justify-between">
                          <Button
                            variant="light"
                            onClick={() => setStep(1)}
                            startContent={<span>⬅</span>}
                          >
                            Back to FIR
                          </Button>
                          <div className="flex gap-4 items-center">
                            {evidenceFile && (
                              <Chip color="success" variant="flat">
                                {evidenceFile.name}
                              </Chip>
                            )}
                            <Button
                              color="warning"
                              variant="shadow"
                              onClick={processFiles}
                              isLoading={isProcessing}
                              endContent={!isProcessing && <span>🚀</span>}
                            >
                              {evidenceFile ? "Run Analysis" : "Skip & Run Analysis"}
                            </Button>
                          </div>
                        </CardFooter>
                      </Card>
                    </motion.div>
                  )}

                  {/* STEP 3: Processing Status */}
                  {step === 3 && (
                    <motion.div
                      key="step3"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 1.05 }}
                      className="flex justify-center"
                    >
                      <Card
                        className="max-w-md w-full p-8 items-center text-center bg-black/40 backdrop-blur-xl border border-stone-200"
                        shadow="xl"
                      >
                        <CardBody className="overflow-visible items-center py-4">
                          <Progress
                            size="md"
                            isIndeterminate={progressValue === 0}
                            value={progressValue}
                            color="warning"
                            className="max-w-xs mb-8 shadow"
                          />
                          <h3 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-700 to-amber-900 mb-2">
                            Executing Neural Networks
                          </h3>
                          <div className="flex flex-col gap-3 mt-4 text-sm text-stone-600 font-mono text-left w-full bg-stone-200 p-4 rounded-lg">
                            <p
                              className={
                                progressValue > 10 ? "text-success" : ""
                              }
                            >
                              &gt; Initializing OCR Engine...
                            </p>
                            <p
                              className={
                                progressValue > 30
                                  ? "text-success"
                                  : "opacity-30"
                              }
                            >
                              &gt; Extracting FIR IPC codes...
                            </p>
                            <p
                              className={
                                progressValue > 50
                                  ? "text-success"
                                  : "opacity-30"
                              }
                            >
                              &gt; Running Forensic Deepfake Scan...
                            </p>
                            <p
                              className={
                                progressValue > 80
                                  ? "text-success"
                                  : "opacity-30"
                              }
                            >
                              &gt; Mapping Multimodal Vectors...
                            </p>
                          </div>
                        </CardBody>
                      </Card>
                    </motion.div>
                  )}

                  {/* STEP 4: Results */}
                  {step === 4 && firResult && (
                    <motion.div
                      key="step4"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <div className="flex justify-between items-center mb-6">
                        <h2 className="text-3xl font-bold flex items-center gap-3">
                          <span className="text-success">✅</span> Analysis
                          Complete
                        </h2>
                        <div className="flex gap-3">
                          <Button
                            color="success"
                            variant="shadow"
                            onClick={generatePDF}
                            className="font-bold"
                          >
                            ⬇ Download PDF Report
                          </Button>
                          <Button
                            color="default"
                            variant="flat"
                            onClick={resetFlow}
                          >
                            Start New Case
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* FIR Panel */}
                        <Card className="bg-amber-900/10 border border-amber-500/30 backdrop-blur-md">
                          <CardHeader className="px-6 pt-6 flex gap-3">
                            <span className="text-2xl">📄</span>
                            <div className="flex flex-col">
                              <p className="text-md font-bold text-amber-700">
                                FIR Legal Context
                              </p>
                              <p className="text-xs text-stone-600">
                                Extracted via OCR/YOLOv8
                              </p>
                            </div>
                          </CardHeader>
                          <Divider className="bg-amber-500/20" />
                          <CardBody className="px-6 py-6 flex flex-col gap-4">
                            <div>
                              <p className="text-sm font-semibold mb-2">
                                Detected Statutes:
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {firResult.detected_ipcs?.length > 0 ? (
                                  firResult.detected_ipcs.map((ipc) => (
                                    <Chip
                                      key={ipc}
                                      color="warning"
                                      variant="flat"
                                    >
                                      {ipc}
                                    </Chip>
                                  ))
                                ) : (
                                  <Chip>None Detected</Chip>
                                )}
                              </div>
                            </div>
                            <div className="mt-2 p-4 bg-stone-100 rounded-lg">
                              <p className="text-sm font-semibold mb-1 text-stone-500">
                                Punishment Mapping
                              </p>
                              <p className="text-sm leading-relaxed mb-4">
                                {firResult.explanation}
                              </p>

                              {firResult.key_factors && firResult.key_factors.length > 0 && (
                                <div>
                                  <p className="text-xs font-semibold text-stone-600 uppercase mb-2">
                                    Detailed Findings & Statutes
                                  </p>
                                  <ul className="flex flex-col gap-2">
                                    {firResult.key_factors.map((factor, idx) => (
                                      <li key={idx} className="text-xs flex items-start gap-2">
                                        <span className="text-amber-500 mt-0.5">▶</span>
                                        <span className="leading-relaxed">{factor}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          </CardBody>
                        </Card>

                        {/* Evidence Panel */}
                        {evidenceResult && (
                          <Card
                            className={`backdrop-blur-md border ${evidenceResult.is_manipulated
                              ? "bg-danger-900/10 border-danger-500/30"
                              : "bg-success-900/10 border-success-500/30"
                              }`}
                          >
                            <CardHeader className="px-6 pt-6 flex gap-3">
                              <span className="text-2xl">🔍</span>
                              <div className="flex flex-col">
                                <p
                                  className={`text-md font-bold ${evidenceResult.is_manipulated
                                    ? "text-red-600"
                                    : "text-emerald-600"
                                    }`}
                                >
                                  Evidence Authenticity
                                </p>
                                <p className="text-xs text-stone-600">
                                  Forensic Pixel/Audio Analytics
                                </p>
                              </div>
                            </CardHeader>
                            <Divider
                              className={
                                evidenceResult.is_manipulated
                                  ? "bg-danger-500/20"
                                  : "bg-success-500/20"
                              }
                            />
                            <CardBody className="px-6 py-6 flex flex-col gap-4">
                              <div
                                className={`p-4 rounded-xl flex items-center justify-between ${evidenceResult.is_manipulated
                                  ? "bg-danger-500/20 border-danger-500/50 border"
                                  : "bg-success-500/20 border-success-500/50 border"
                                  }`}
                              >
                                <h4
                                  className={`text-lg font-bold tracking-wider ${evidenceResult.is_manipulated
                                    ? "text-danger-500"
                                    : "text-success-500"
                                    }`}
                                >
                                  {evidenceResult.is_manipulated
                                    ? "⚠️ TAMPERED"
                                    : "✅ AUTHENTIC"}
                                </h4>
                                <div className="text-right">
                                  <p className="text-xs text-stone-600 uppercase font-bold">
                                    Confidence
                                  </p>
                                  <p className="text-xl font-mono">
                                    {evidenceResult.confidence_score.toFixed(1)}%
                                  </p>
                                </div>
                              </div>

                              <p className="text-sm leading-relaxed">
                                {evidenceResult.explanation}
                              </p>

                              <div className="mt-2">
                                <p className="text-xs font-semibold text-stone-600 uppercase mb-2">
                                  Key Highlights
                                </p>
                                <ul className="flex flex-col gap-2">
                                  {evidenceResult.key_factors.map(
                                    (factor, idx) => (
                                      <li
                                        key={idx}
                                        className="text-xs flex items-center gap-2"
                                      >
                                        <span className="text-amber-500">▶</span>{" "}
                                        {factor}
                                      </li>
                                    ),
                                  )}
                                </ul>
                              </div>
                            </CardBody>
                          </Card>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div >
  );
}

export default Dashboard;
