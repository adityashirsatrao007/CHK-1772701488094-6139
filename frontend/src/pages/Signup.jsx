import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button, Card, CardBody, Input, Select, SelectItem } from "@nextui-org/react";
import { motion } from "framer-motion";
import { register } from "../services/auth";

function Signup() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "analyst",
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const roles = [
    { key: "judiciary", label: "Judiciary" },
    { key: "officer", label: "Law Enforcement" },
    { key: "legal", label: "Legal Counsel" },
    { key: "analyst", label: "Analyst" },
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setIsLoading(true);

    try {
      const result = await register(formData.name, formData.email, formData.password);
      if (result.success) {
        navigate("/app");
      } else {
        setError(result.error || "Registration failed.");
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex items-center justify-center px-4 py-12">
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-bl from-court-200 to-transparent rounded-full opacity-30 blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-tr from-court-200 to-transparent rounded-full opacity-40 blur-3xl translate-y-1/3 -translate-x-1/3 pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm relative z-10"
      >
        <div className="text-center mb-6">
          <div className="flex flex-col items-center justify-center gap-2 mb-2">
            <div className="w-16 h-16 rounded-full bg-court-50 border border-gold-300 flex items-center justify-center shadow-sm mb-2">
              <span className="text-3xl">⚖️</span>
            </div>
            <h1 className="text-3xl font-bold font-serif text-foreground tracking-tight">
              Sign Up
            </h1>
          </div>
        </div>

        <Card className="bg-white/95 backdrop-blur-xl border border-court-200 shadow-premium overflow-hidden rounded-2xl">
          <CardBody className="p-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="bg-red-50 border-l-4 border-red-600 text-red-800 px-4 py-3 rounded text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <Input
                  type="text"
                  label="Name"
                  placeholder="Enter your name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  variant="bordered"
                  classNames={{
                    label: "text-foreground font-semibold",
                    inputWrapper: "bg-court-50 border-court-200 focus-within:!border-gold-500",
                  }}
                />

                <Input
                  type="email"
                  label="Email"
                  placeholder="Enter your email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  variant="bordered"
                  classNames={{
                    label: "text-foreground font-semibold",
                    inputWrapper: "bg-court-50 border-court-200 focus-within:!border-gold-500",
                  }}
                />

                <Select
                  label="Role"
                  placeholder="Select a role"
                  selectedKeys={[formData.role]}
                  onChange={(e) => setFormData((prev) => ({ ...prev, role: e.target.value }))}
                  variant="bordered"
                  classNames={{
                    label: "text-foreground font-semibold",
                    trigger: "bg-court-50 border-court-200 focus-within:!border-gold-500",
                  }}
                >
                  {roles.map((role) => (
                    <SelectItem key={role.key} value={role.key} className="text-foreground">
                      {role.label}
                    </SelectItem>
                  ))}
                </Select>

                <Input
                  type="password"
                  label="Password"
                  placeholder="Enter your password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  variant="bordered"
                  classNames={{
                    label: "text-foreground font-semibold",
                    inputWrapper: "bg-court-50 border-court-200 focus-within:!border-gold-500",
                  }}
                />
              </div>

              <Button
                type="submit"
                className="w-full font-bold bg-foreground text-gold-200 shadow-premium hover:bg-black mt-2"
                size="lg"
                isLoading={isLoading}
              >
                Create Account
              </Button>
            </form>

            <div className="mt-6 text-center text-sm text-court-600 space-y-2">
              <p>
                Already have an account?{" "}
                <Link to="/login" className="text-gold-600 hover:text-gold-700 font-bold hover:underline">
                  Sign in
                </Link>
              </p>
              <p>
                <Link to="/" className="text-court-500 hover:text-foreground font-medium hover:underline">
                  Return to Home
                </Link>
              </p>
            </div>
          </CardBody>
        </Card>
      </motion.div>
    </div>
  );
}

export default Signup;
