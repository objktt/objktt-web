import React from 'react';
import AboutSection from '../components/AboutSection';
import { usePageSeo } from '../data/pageSeo';

const About: React.FC = () => {
  usePageSeo('about');
  return (
    <div style={{ padding: 0 }}>
      <AboutSection />
    </div>
  );
};

export default About;
