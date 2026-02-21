import React, { useState, useRef } from 'react';
import Grid from '../components/GridSystem';
import emailjs from '@emailjs/browser';
import { useLanguage } from '../contexts/LanguageContext';

const Contact: React.FC = () => {
  const formRef = useRef<HTMLFormElement>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  });
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const { t } = useLanguage();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');

    // EmailJS Service
    // NOTE: Replace these with your actual Service ID, Template ID, and Public Key
    // You can find these in your EmailJS dashboard: https://dashboard.emailjs.com/
    const SERVICE_ID = 'service_vgxq9ev';
    const TEMPLATE_ID = 'template_oxzhf08';
    const PUBLIC_KEY = 'FhaoMuWPdR1b2o9MU';

    if (formRef.current) {
      emailjs.sendForm(SERVICE_ID, TEMPLATE_ID, formRef.current, PUBLIC_KEY)
        .then((result) => {
            console.log(result.text);
            setStatus('success');
            setFormData({ name: '', email: '', message: '' }); // Clear form
        }, (error) => {
            console.log(error.text);
            setStatus('error');
        });
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const inputStyle = {
    width: '100%',
    backgroundColor: 'transparent',
    border: 'none',
    borderBottom: '1px solid var(--color-line)',
    padding: '1rem 0',
    fontSize: '1.5rem',
    color: 'var(--color-text)',
    fontFamily: 'inherit',
    outline: 'none',
    borderRadius: 0,
    marginBottom: '2rem'
  };

  return (
    <div style={{ padding: '4rem 0' }}>
      <Grid>
        <div style={{ gridColumn: '2 / 12', marginBottom: '2rem' }}>
            <a href="/about" style={{ 
                fontSize: '1rem', 
                textDecoration: 'none', 
                color: 'var(--color-text)', 
                opacity: 0.6,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem'
            }}>
                &larr; {t.contact.back}
            </a>
        </div>

        <div style={{ gridColumn: '2 / 12', marginBottom: '4rem' }}>
          <h2 className="page-heading" style={{ fontSize: '3.5rem', fontWeight: 700, lineHeight: 1.1, letterSpacing: '-0.02em' }}>
            {t.contact.title}
          </h2>
        </div>

        <div style={{ gridColumn: '2 / 8' }}>
          <form ref={formRef} onSubmit={handleSubmit}>
            <div style={{ marginBottom: '2rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', opacity: 0.6 }}>{t.contact.name}</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                style={inputStyle}
                required
              />
            </div>
            
            <div style={{ marginBottom: '2rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', opacity: 0.6 }}>{t.contact.email}</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                style={inputStyle}
                required
              />
            </div>

            <div style={{ marginBottom: '4rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', opacity: 0.6 }}>{t.contact.message}</label>
              <textarea
                name="message"
                value={formData.message}
                onChange={handleChange}
                style={{ ...inputStyle, minHeight: '200px', resize: 'vertical' }}
                required
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                <button 
                type="submit" 
                disabled={status === 'sending' || status === 'success'}
                style={{ 
                    background: 'none', 
                    border: 'none', 
                    padding: 0, 
                    fontSize: '2rem', 
                    fontWeight: 700, 
                    cursor: status === 'sending' ? 'wait' : 'pointer', 
                    color: 'var(--color-text)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    opacity: status === 'sending' ? 0.5 : 1
                }}
                >
                {status === 'sending' ? t.contact.sending : t.contact.send} <span style={{ fontSize: '1.5rem' }}>&rarr;</span>
                </button>

                {status === 'success' && <span style={{ color: 'green', fontSize: '1.2rem' }}>{t.contact.success}</span>}
                {status === 'error' && <span style={{ color: 'red', fontSize: '1.2rem' }}>{t.contact.error}</span>}
            </div>
          </form>
        </div>

        <div style={{ gridColumn: '9 / 12' }}>
            <p style={{ fontSize: '1.25rem', lineHeight: 1.6, marginTop: '2.5rem', whiteSpace: 'pre-line' }}>
                {t.contact.info}
            </p>
            <p style={{ fontSize: '1rem', opacity: 0.6, marginTop: '2rem' }}>
                hello@objktt.kr
            </p>
        </div>
      </Grid>
    </div>
  );
};

export default Contact;
