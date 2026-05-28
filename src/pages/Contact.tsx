import React, { useState } from 'react';
import Grid from '../components/GridSystem';
import { useLanguage } from '../contexts/LanguageContext';
import { useBreakpoint } from '../hooks/useBreakpoint';

const Contact: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  });
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const { t } = useLanguage();
  const { isMobile } = useBreakpoint();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');
    try {
      const r = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!r.ok) throw new Error('send failed');
      setStatus('success');
      setFormData({ name: '', email: '', message: '' });
    } catch {
      setStatus('error');
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
    <div style={{ padding: '0 0 4rem 0' }}>
      {/* Section Title */}
      <div style={{
        padding: `${isMobile ? '5rem' : '7rem'} ${isMobile ? '1.5rem' : '4rem'} ${isMobile ? '2rem' : '3rem'}`,
      }}>
        <h2 style={{
          fontSize: isMobile ? '10vw' : 'clamp(3rem, 6vw, 6.5rem)',
          fontWeight: 500,
          lineHeight: 0.95,
          letterSpacing: isMobile ? '-0.03em' : '-0.04em',
          margin: 0,
        }}>
          {t.contact.title}
        </h2>
      </div>

      <Grid>

        <div style={{ gridColumn: '2 / 8' }}>
          <form onSubmit={handleSubmit}>
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
