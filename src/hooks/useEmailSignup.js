import { useState } from 'react';

export const useEmailSignup = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const subscribe = async (formData) => {
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      // Validate inputs
      if (!formData.name || !formData.name.trim()) {
        throw new Error('Name is required');
      }

      if (!formData.email || !formData.email.trim()) {
        throw new Error('Email is required');
      }

      if (!validateEmail(formData.email)) {
        throw new Error('Please enter a valid email address');
      }

      // Simulate API call delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Store subscription in localStorage
      const existingSubscribers = JSON.parse(
        localStorage.getItem('kibaySubscribers') || '[]'
      );

      // Check for duplicate email
      const isDuplicate = existingSubscribers.some(
        (sub) => sub.email.toLowerCase() === formData.email.toLowerCase()
      );

      if (isDuplicate) {
        throw new Error('This email is already subscribed');
      }

      const newSubscriber = {
        ...formData,
        timestamp: new Date().toISOString(),
        id: Date.now().toString(),
      };

      existingSubscribers.push(newSubscriber);
      localStorage.setItem(
        'kibaySubscribers',
        JSON.stringify(existingSubscribers)
      );

      setSuccess(true);
      setIsSubmitting(false);
      return { success: true };
    } catch (err) {
      setError(err.message);
      setIsSubmitting(false);
      return { success: false, error: err.message };
    }
  };

  const reset = () => {
    setError(null);
    setSuccess(false);
    setIsSubmitting(false);
  };

  return {
    isSubmitting,
    error,
    success,
    subscribe,
    reset,
  };
};