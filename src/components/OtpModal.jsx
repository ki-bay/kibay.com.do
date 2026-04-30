import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, ArrowRight, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

const OtpModal = ({ isOpen, onClose, email, onVerify, onResend, isLoading, error }) => {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [canResend, setCanResend] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const inputRefs = useRef([]);

  // Timer logic for resend button
  useEffect(() => {
    let timer;
    if (isOpen && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    } else if (countdown === 0) {
      setCanResend(true);
    }
    return () => clearInterval(timer);
  }, [isOpen, countdown]);

  // Reset OTP when modal opens
  useEffect(() => {
    if (isOpen) {
      setOtp(['', '', '', '', '', '']);
      setCountdown(30);
      setCanResend(false);
      // Slight delay to ensure DOM is ready for focus
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 100);
    }
  }, [isOpen]);

  const handleChange = (element, index) => {
    // Ensure only numbers are entered
    if (isNaN(element.value)) return false;

    const newOtp = [...otp];
    newOtp[index] = element.value;
    setOtp(newOtp);

    // Auto-focus next input
    if (element.value !== '' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
    
    // Auto-submit if all 6 digits are filled
    if (element.value !== '' && index === 5) {
        const fullCode = [...newOtp];
        // Only submit if all fields have values
        if (fullCode.every(digit => digit !== '')) {
            onVerify(fullCode.join(''));
        }
    }
  };

  const handleKeyDown = (e, index) => {
    // Handle backspace navigation
    if (e.key === 'Backspace') {
      if (index > 0 && otp[index] === '') {
        inputRefs.current[index - 1]?.focus();
        const newOtp = [...otp];
        newOtp[index - 1] = '';
        setOtp(newOtp);
      } else {
        const newOtp = [...otp];
        newOtp[index] = '';
        setOtp(newOtp);
      }
    }
    // Handle left arrow
    if (e.key === 'ArrowLeft' && index > 0) {
        inputRefs.current[index - 1]?.focus();
    }
    // Handle right arrow
    if (e.key === 'ArrowRight' && index < 5) {
        inputRefs.current[index + 1]?.focus();
    }
  };
  
  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6).split('');
    if (pastedData.every(char => !isNaN(char))) {
        const newOtp = [...otp];
        pastedData.forEach((char, index) => {
            if (index < 6) newOtp[index] = char;
        });
        setOtp(newOtp);
        const nextFocus = Math.min(pastedData.length, 5);
        inputRefs.current[nextFocus]?.focus();
        
        // Auto submit on paste if length is 6
        if (pastedData.length === 6) {
             onVerify(pastedData.join(''));
        }
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const code = otp.join('');
    if (code.length === 6) {
      onVerify(code);
    }
  };
  
  const handleResendClick = () => {
      if (!canResend) return;
      onResend();
      setCountdown(30);
      setCanResend(false);
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          
          {/* Modal Content */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="relative bg-background border border-foreground/10 rounded-2xl p-8 w-full max-w-md shadow-2xl z-10 mx-4"
          >
            <button
              onClick={onClose}
              className="absolute right-4 top-4 text-foreground/40 hover:text-foreground transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-foreground mb-2">Verification</h3>
              <p className="text-foreground/60">
                Enter the 6-digit code sent to <br />
                <span className="text-mango-400 font-medium">{email}</span>
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="flex gap-2 justify-center">
                {otp.map((data, index) => (
                  <input
                    key={index}
                    ref={(el) => (inputRefs.current[index] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={data}
                    onChange={(e) => handleChange(e.target, index)}
                    onKeyDown={(e) => handleKeyDown(e, index)}
                    onFocus={(e) => e.target.select()}
                    onPaste={index === 0 ? handlePaste : undefined}
                    className="w-10 h-14 sm:w-12 sm:h-16 text-center text-xl sm:text-2xl font-bold bg-card border border-foreground/10 rounded-lg text-foreground focus:border-mango-500 focus:ring-1 focus:ring-mango-500 focus:outline-none transition-all"
                  />
                ))}
              </div>

              {error && (
                <div className="text-red-400 text-sm text-center bg-red-500/10 p-2 rounded border border-red-500/20">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                disabled={isLoading || otp.join('').length < 6}
                className="w-full bg-mango-500 hover:bg-mango-600 text-foreground py-6 text-lg font-medium"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    Verifying...
                  </>
                ) : (
                  <>
                    Verify & Login <ArrowRight className="ml-2 w-5 h-5" />
                  </>
                )}
              </Button>
              
              <div className="text-center space-y-3">
                  <button 
                      type="button"
                      onClick={handleResendClick}
                      disabled={!canResend}
                      className={`text-sm flex items-center justify-center gap-2 mx-auto transition-colors ${canResend ? 'text-mango-400 hover:text-mango-300' : 'text-foreground/30 cursor-not-allowed'}`}
                  >
                      <RefreshCw className={`w-3 h-3 ${!canResend && 'animate-spin-slow'}`} />
                      {canResend ? "Resend Code" : `Resend in ${countdown}s`}
                  </button>

                  <button 
                      type="button"
                      onClick={onClose}
                      className="text-xs text-foreground/40 hover:text-foreground transition-colors block w-full"
                  >
                      Use a different email
                  </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default OtpModal;