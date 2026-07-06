import { useState, useEffect, useRef } from "react";
import axios from "axios";

const MAX_ATTEMPTS = 3;

export default function OtpVerificationApp() {
  const [stage, setStage] = useState("phone"); // phone | otp | success | locked
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState("");

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [otpError, setOtpError] = useState("");
  const [attemptsLeft, setAttemptsLeft] = useState(MAX_ATTEMPTS);
  const [secondsLeft, setSecondsLeft] = useState(30);
  const [toast, setToast] = useState("");

  const inputsRef = useRef([]);

  // Timer Countdown Effect
  useEffect(() => {
    if (stage !== "otp") return;
    if (secondsLeft <= 0) return;
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [stage, secondsLeft]);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 3000); // Bumped to 3s so you have time to copy the console/demo OTP hint!
  }

  function validatePhone(value) {
    return /^[0-9]{10}$/.test(value);
  }

  // 1. HANDLER TO REQUEST NEW OTP FROM BACKEND
  async function handleSendOtp() {
    if (!validatePhone(phone)) {
      setPhoneError("Enter a valid 10-digit mobile number.");
      return;
    }
    setPhoneError("");

    try {
      const res = await axios.post('http://localhost:3000/getotp', { phone: phone });
      
      setOtp(["", "", "", "", "", ""]);
      setOtpError("");
      setAttemptsLeft(res.data.attemptsLeft);
      setSecondsLeft(res.data.cooldown); // Syncs directly to the Redis dynamic sliding delay
      setStage("otp");
      showToast(`Demo Hint! Code is: ${res.data.otp}`);
    } catch (err) {
      const errorMsg = err.response?.data?.message || "Request failed.";
      setPhoneError(errorMsg);
      showToast(errorMsg);
    }
  }

  // 2. HANDLER TO VERIFY SUBMITTED CODE WITH BACKEND
  async function handleVerify() {
    const code = otp.join(""); // Converts array ["1","2"...] into a clean string "123456"
    if (code.length < 6) {
      setOtpError("Please enter all 6 digits.");
      return;
    }

    try {
      const res = await axios.post(`http://localhost:3000/verifyotp/${phone}`, { otp: code });
      
      // Store returned JWT securely for future WebSocket upgrades!
      localStorage.setItem("userToken", res.data.token);
      
      setStage("success");
      showToast("Authorized!");
    } catch (err) {
      const errorMsg = err.response?.data?.message || "Invalid Code.";
      setOtpError(errorMsg);
      
      // Reduce visual counter metric locally
      setAttemptsLeft((prev) => {
        const nextVal = prev - 1;
        if (nextVal <= 0) setStage("locked");
        return nextVal;
      });
    }
  }

  // 3. HANDLER FOR RESEND ACTION
  async function handleResend() {
    if (secondsLeft > 0) return;
    // Simply run the request logic again—our backend handles checking the sliding limit counts!
    await handleSendOtp();
    setTimeout(() => inputsRef.current[0]?.focus(), 50);
  }

  function handleOtpChange(index, value) {
    if (!/^[0-9]?$/.test(value)) return;
    const next = [...otp];
    next[index] = value;
    setOtp(next);
    if (value && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index, e) {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  }

  function handleStartOver() {
    setStage("phone");
    setPhone("");
    setPhoneError("");
    setOtp(["", "", "", "", "", ""]);
    setOtpError("");
    setAttemptsLeft(MAX_ATTEMPTS);
    setSecondsLeft(30);
  }

  return (
    <div style={styles.desktop}>
      <div style={styles.windowShell}>
        {/* Title bar */}
        <div style={styles.titleBar}>
          <div style={styles.titleBarLeft}>
            <span style={styles.titleIcon}>&#9745;</span>
            <span>OTP Verification.exe</span>
          </div>
          <div style={styles.titleBarButtons}>
            <button style={styles.chromeBtn} aria-label="minimize">_</button>
            <button style={styles.chromeBtn} aria-label="maximize">&#9633;</button>
            <button style={{ ...styles.chromeBtn, ...styles.closeBtn }} aria-label="close">X</button>
          </div>
        </div>

        {/* Menu bar */}
        <div style={styles.menuBar}>
          <span style={styles.menuItem}>File</span>
          <span style={styles.menuItem}>Edit</span>
          <span style={styles.menuItem}>View</span>
          <span style={styles.menuItem}>Help</span>
        </div>

        {/* Body */}
        <div style={styles.body}>
          {stage === "phone" && (
            <PhoneStage
              phone={phone}
              setPhone={setPhone}
              phoneError={phoneError}
              onSend={handleSendOtp}
            />
          )}

          {stage === "otp" && (
            <OtpStage
              phone={phone}
              otp={otp}
              otpError={otpError}
              attemptsLeft={attemptsLeft}
              secondsLeft={secondsLeft}
              inputsRef={inputsRef}
              onChange={handleOtpChange}
              onKeyDown={handleKeyDown}
              onVerify={handleVerify}
              onResend={handleResend}
              onBack={handleStartOver}
            />
          )}

          {stage === "success" && (
            <SuccessStage phone={phone} onRestart={handleStartOver} />
          )}

          {stage === "locked" && (
            <LockedStage onRestart={handleStartOver} />
          )}
        </div>

        {/* Status bar */}
        <div style={styles.statusBar}>
          <span>Ready</span>
          <span style={{ marginLeft: "auto" }}>Retro UI v1.0</span>
        </div>
      </div>

      {toast && <div style={styles.toast}>{toast}</div>}
    </div>
  );
}

function PhoneStage({ phone, setPhone, phoneError, onSend }) {
  return (
    <div>
      <Panel title="Enter mobile number">
        <p style={styles.helpText}>
          We will send a 6-digit one-time password to verify your number.
        </p>
        <div style={styles.fieldRow}>
          <label style={styles.label}>Mobile No.</label>
          <div style={styles.inputCombo}>
            <span style={styles.prefix}>+91</span>
            <input
              style={styles.textInput}
              type="text"
              maxLength={10}
              placeholder="9876543210"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ""))}
            />
          </div>
        </div>
        {phoneError && <div style={styles.errorBox}>&#9888; {phoneError}</div>}
      </Panel>

      <div style={styles.buttonRow}>
        <button style={styles.xpButton} onClick={onSend}>
          Send OTP &rarr;
        </button>
      </div>
    </div>
  );
}

function OtpStage({
  phone,
  otp,
  otpError,
  attemptsLeft,
  secondsLeft,
  inputsRef,
  onChange,
  onKeyDown,
  onVerify,
  onResend,
  onBack,
}) {
  return (
    <div>
      <Panel title={"Verify code sent to +91 " + phone}>
        <p style={styles.helpText}>
          Enter the 6-digit code.
        </p>

        <div style={styles.otpRow}>
          {otp.map((digit, i) => (
            <input
              key={i}
              ref={(el) => (inputsRef.current[i] = el)}
              style={styles.otpBox}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => onChange(i, e.target.value)}
              onKeyDown={(e) => onKeyDown(i, e)}
            />
          ))}
        </div>

        {otpError && <div style={styles.errorBox}>&#9888; {otpError}</div>}

        <div style={styles.metaRow}>
          <div style={styles.metaBox}>
            Attempts left: <b>{attemptsLeft}</b> / {MAX_ATTEMPTS}
          </div>
          <div style={styles.metaBox}>
            {secondsLeft > 0 ? (
              <span>Resend in 00:{String(secondsLeft).padStart(2, "0")}</span>
            ) : (
              <span style={styles.resendLink} onClick={onResend}>
                Resend OTP
              </span>
            )}
          </div>
        </div>
      </Panel>

      <div style={styles.buttonRow}>
        <button style={styles.xpButtonSecondary} onClick={onBack}>
          &larr; Back
        </button>
        <button style={styles.xpButton} onClick={onVerify}>
          Verify
        </button>
      </div>
    </div>
  );
}

function SuccessStage({ phone, onRestart }) {
  return (
    <div style={styles.successWrap}>
      <div style={styles.successIcon}>&#10003;</div>
      <div style={styles.successTitle}>Login Successful</div>
      <p style={styles.helpText}>
        Mobile number +91 {phone} has been verified.
      </p>
      <div style={styles.buttonRow}>
        <button style={styles.xpButton} onClick={onRestart}>
          Done
        </button>
      </div>
    </div>
  );
}

function LockedStage({ onRestart }) {
  return (
    <div style={styles.successWrap}>
      <div style={{ ...styles.successIcon, color: "#b00000" }}>&#10007;</div>
      <div style={{ ...styles.successTitle, color: "#b00000" }}>
        Too Many Attempts
      </div>
      <p style={styles.helpText}>
        You have used all attempts or are locked out by the server. Please try again later.
      </p>
      <div style={styles.buttonRow}>
        <button style={styles.xpButton} onClick={onRestart}>
          Start Over
        </button>
      </div>
    </div>
  );
}

function Panel({ title, children }) {
  return (
    <fieldset style={styles.fieldset}>
      <legend style={styles.legend}>{title}</legend>
      {children}
    </fieldset>
  );
}

const styles = {
  desktop: {
    minHeight: "100vh",
    width: "100%",
    background: "#1851c4",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px 12px",
    fontFamily: "Tahoma, Verdana, Arial, sans-serif",
    boxSizing: "border-box",
  },
  windowShell: {
    width: "100%",
    maxWidth: 420,
    background: "#ECE9D8",
    border: "2px solid #0a246a",
    borderRadius: 8,
    boxShadow: "3px 3px 0 rgba(0,0,0,0.4)",
    overflow: "hidden",
  },
  titleBar: {
    background: "linear-gradient(180deg, #2a6fdb 0%, #1851c4 50%, #1a4fc0 100%)",
    color: "#ffffff",
    padding: "5px 6px 5px 10px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    fontSize: 13,
    fontWeight: "bold",
  },
  titleBarLeft: {
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  titleIcon: {
    fontSize: 12,
  },
  titleBarButtons: {
    display: "flex",
    gap: 3,
  },
  chromeBtn: {
    width: 20,
    height: 18,
    fontSize: 11,
    fontWeight: "bold",
    background: "linear-gradient(180deg,#5a9bf2,#1a4fc0)",
    color: "#fff",
    border: "1px solid #0a246a",
    borderRadius: 3,
    cursor: "pointer",
    lineHeight: "14px",
  },
  closeBtn: {
    background: "linear-gradient(180deg,#f29a9a,#c01818)",
  },
  menuBar: {
    background: "#ECE9D8",
    borderBottom: "1px solid #b8b3a3",
    display: "flex",
    gap: 14,
    padding: "3px 10px",
    fontSize: 12,
  },
  menuItem: {
    cursor: "default",
  },
  body: {
    padding: 14,
    background: "#ECE9D8",
  },
  fieldset: {
    border: "1px solid #8c8a7e",
    borderRadius: 4,
    background: "#ffffff",
    padding: "12px 12px 14px",
    margin: 0,
  },
  legend: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#0a246a",
    padding: "0 4px",
  },
  helpText: {
    fontSize: 12,
    color: "#333",
    marginTop: 2,
    marginBottom: 10,
  },
  fieldRow: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    marginBottom: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#222",
  },
  inputCombo: {
    display: "flex",
    border: "1px solid #7a7a7a",
    borderRadius: 3,
    overflow: "hidden",
    background: "#fff",
  },
  prefix: {
    background: "#dcd9c8",
    padding: "6px 8px",
    fontSize: 13,
    borderRight: "1px solid #7a7a7a",
    color: "#333",
  },
  textInput: {
    flex: 1,
    border: "none",
    outline: "none",
    padding: "6px 8px",
    fontSize: 14,
    letterSpacing: 1,
    fontFamily: "Tahoma, Verdana, Arial, sans-serif",
  },
  otpRow: {
    display: "flex",
    gap: 6,
    justifyContent: "center",
    marginBottom: 10,
  },
  otpBox: {
    width: 36,
    height: 40,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "bold",
    border: "1px solid #7a7a7a",
    borderRadius: 3,
    outline: "none",
    boxShadow: "inset 1px 1px 2px rgba(0,0,0,0.2)",
  },
  errorBox: {
    background: "#fff2cc",
    border: "1px solid #e0b400",
    color: "#7a5b00",
    fontSize: 11,
    padding: "5px 8px",
    borderRadius: 3,
    marginBottom: 8,
  },
  metaRow: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: 11,
    color: "#333",
    marginTop: 4,
  },
  metaBox: {
    background: "#f0eedd",
    border: "1px solid #cfc9b2",
    borderRadius: 3,
    padding: "4px 8px",
  },
  resendLink: {
    color: "#0a246a",
    fontWeight: "bold",
    textDecoration: "underline",
    cursor: "pointer",
  },
  buttonRow: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 12,
  },
  xpButton: {
    background: "linear-gradient(180deg, #8fd16a 0%, #4f9c2e 55%, #3f8a22 100%)",
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: 13,
    border: "1px solid #2f6b18",
    borderRadius: 14,
    padding: "7px 18px",
    cursor: "pointer",
    boxShadow: "0 1px 0 rgba(255,255,255,0.5) inset, 1px 1px 2px rgba(0,0,0,0.3)",
  },
  xpButtonSecondary: {
    background: "linear-gradient(180deg, #f5f3e8 0%, #ddd9c4 55%, #c9c4ab 100%)",
    color: "#333",
    fontWeight: "bold",
    fontSize: 13,
    border: "1px solid #8c8a7e",
    borderRadius: 14,
    padding: "7px 18px",
    cursor: "pointer",
  },
  successWrap: {
    textAlign: "center",
    padding: "10px 6px 4px",
  },
  successIcon: {
    fontSize: 46,
    color: "#2f8a2f",
    background: "#fff",
    border: "2px solid #2f8a2f",
    borderRadius: "50%",
    width: 70,
    height: 70,
    lineHeight: "66px",
    margin: "0 auto 10px",
  },
  successTitle: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#2f8a2f",
    marginBottom: 4,
  },
  statusBar: {
    display: "flex",
    fontSize: 11,
    color: "#444",
    background: "#ECE9D8",
    borderTop: "1px solid #b8b3a3",
    padding: "4px 10px",
  },
  toast: {
    position: "fixed",
    bottom: 18,
    left: "50%",
    transform: "translateX(-50%)",
    background: "#ffffe1",
    border: "1px solid #000",
    boxShadow: "2px 2px 0 rgba(0,0,0,0.4)",
    padding: "6px 12px",
    fontSize: 12,
    color: "#000",
  },
};