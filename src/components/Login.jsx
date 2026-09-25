// frontend/src/components/Login.jsx
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Login.css';

const Login = () => {
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState(['', '', '', '']); // 4-digit OTP array
    const [step, setStep] = useState('phone');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [timer, setTimer] = useState(0);
    const inputRefs = useRef([]);
    const navigate = useNavigate();
    const API_URL = 'https://dtalkbusiness.designerbrids.com/api';

    useEffect(() => {
        if (step === 'otp') {
            inputRefs.current[0]?.focus();
        }
    }, [step]);

    useEffect(() => {
        if (timer > 0) {
            const interval = setInterval(() => setTimer(t => t - 1), 1000);
            return () => clearInterval(interval);
        }
    }, [timer]);

    const handleOtpChange = (index, value) => {
        if (value.length > 1) return;
        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);

        // Fixed: 4 digits ke liye index < 3 hona chahiye
        if (value && index < 3) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleOtpPaste = (e) => {
        const paste = e.clipboardData.getData('text');
        if (paste.length === 4 && /^\d+$/.test(paste)) {
            const digits = paste.split('');
            setOtp(digits);
            inputRefs.current[3]?.focus();
        }
    };

    // ============================================
    // SEND OTP
    // ============================================
    const sendOTP = async (e) => {
        e.preventDefault();

        if (phone.length < 10) {
            setError('Please enter a valid phone number');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await axios.post(`${API_URL}/auth/send-otp`, {
                phone: phone.trim(),
            });

            if (response.data.success) {
                setStep('otp');
                setTimer(60);
                console.log('📱 OTP sent successfully');
            }
        } catch (err) {
            console.error('❌ Error:', err);
            setError(err.response?.data?.error || 'Failed to send OTP');
        } finally {
            setLoading(false);
        }
    };

    // ============================================
    // VERIFY OTP (Robust Storage Fix)
    // ============================================
    const verifyOTP = async (e) => {
        e.preventDefault();
        const otpCode = otp.join('');

        if (otpCode.length !== 4) {
            setError('Please enter 4-digit OTP');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await axios.post(`${API_URL}/auth/verify-otp`, {
                phone: phone.trim(),
                otp: otpCode
            });

            if (response.data.success) {
                const { token, user, userId: rootUserId } = response.data;

                // 1. Save Token safely
                if (token) {
                    localStorage.setItem('token', token);
                }

                // 2. Save User Object if available
                if (user) {
                    localStorage.setItem('user', JSON.stringify(user));
                }

                // 3. Robust UserId extraction from all possible response structures
                const extractedUserId = user?._id || user?.id || rootUserId || response.data.userId;
                if (extractedUserId) {
                    localStorage.setItem('userId', extractedUserId);
                }

                // 4. Save User Name
                if (user?.name) {
                    localStorage.setItem('userName', user.name);
                } else if (response.data.userName) {
                    localStorage.setItem('userName', response.data.userName);
                }

                console.log('✅ OTP verified successfully, session saved.');
                navigate('/dashboard', { replace: true });
            }

        } catch (err) {
            setError(err.response?.data?.error || 'Invalid OTP');
        } finally {
            setLoading(false);
        }
    };

    // ============================================
    // RESEND OTP
    // ============================================
    const resendOTP = async () => {
        if (timer > 0) return;
        setLoading(true);
        setError('');

        try {
            const response = await axios.post(`${API_URL}/auth/send-otp`, {
                phone: phone.trim()
            });
            if (response.data.success) {
                setTimer(60);
                console.log('📱 OTP resent successfully');
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to resend OTP');
        } finally {
            setLoading(false);
        }
    };

    // ============================================
    // PHONE INPUT SCREEN
    // ============================================
    if (step === 'phone') {
        return (
            <div className="login-page">
                <div className="login-box">
                    <div className="login-header">
                        <span className="login-icon">⚡</span>
                        <h1>Kuicqli Chat</h1>
                        <p>Enter your phone number to continue</p>
                    </div>

                    <form onSubmit={sendOTP} className="login-form">
                        <div className="phone-input-wrapper">
                            <span className="country-code">+91</span>
                            <input
                                type="tel"
                                placeholder="Phone Number"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                                maxLength={10}
                                required
                                className="phone-input"
                            />
                        </div>

                        {error && <div className="login-error">{error}</div>}

                        <button type="submit" disabled={loading}>
                            {loading ? 'Sending OTP...' : 'Send OTP →'}
                        </button>
                    </form>

                    <div className="login-footer">
                        <p className="login-hint">We'll send you a 4-digit OTP to verify your number</p>
                    </div>
                </div>
            </div>
        );
    }

    // ============================================
    // OTP INPUT SCREEN
    // ============================================
    return (
        <div className="login-page">
            <div className="login-box">
                <div className="login-header">
                    <span className="login-icon">⚡</span>
                    <h1>Enter OTP</h1>
                    <p>We sent a code to +91 {phone}</p>
                    <button
                        type="button"
                        className="edit-phone-btn"
                        onClick={() => {
                            setStep('phone');
                            setOtp(['', '', '', '']);
                            setError('');
                        }}
                    >
                        ✏️ Edit number
                    </button>
                </div>

                <form onSubmit={verifyOTP} className="login-form">
                    <div className="otp-input-container">
                        {otp.map((digit, index) => (
                            <input
                                key={index}
                                ref={(el) => inputRefs.current[index] = el}
                                type="text"
                                inputMode="numeric"
                                maxLength={1}
                                value={digit}
                                onChange={(e) => handleOtpChange(index, e.target.value)}
                                onPaste={handleOtpPaste}
                                className="otp-input"
                            />
                        ))}
                    </div>

                    {error && <div className="login-error">{error}</div>}

                    <button type="submit" disabled={loading}>
                        {loading ? 'Verifying...' : 'Verify OTP →'}
                    </button>

                    <div className="resend-section">
                        <button
                            type="button"
                            className="resend-btn"
                            onClick={resendOTP}
                            disabled={timer > 0 || loading}
                        >
                            Resend OTP {timer > 0 && `(${timer}s)`}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Login;