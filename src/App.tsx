import { useEffect } from 'react'
import { Routes, Route, useLocation, useNavigationType } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import About from './pages/About'
import Events from './pages/Events'
import Contact from './pages/Contact'
import Menu from './pages/Menu'
import Music from './pages/Music'
import Shop from './pages/Shop'
import ShopProduct from './pages/ShopProduct'
import Notices from './pages/Notices'
import NoticeDetail from './pages/NoticeDetail'
import FAQ from './pages/FAQ'
import Privacy from './pages/Privacy'
import Terms from './pages/Terms'
import Refund from './pages/Refund'
import Points from './pages/Points'
import Checkout from './pages/Checkout'
import Account from './pages/Account'
import { LanguageProvider } from './contexts/LanguageContext'
import { CartProvider } from './contexts/CartContext'
import { AuthProvider } from './contexts/AuthContext'

// With manual scrollRestoration, brand-new (PUSH) navigations must be scrolled
// to the top ourselves. POP (back/forward) is left alone so pages can restore
// their saved position; REPLACE (e.g. updating ?q= search params in place) must
// NOT jump to top — it's the same page.
function ScrollManager() {
  const { pathname } = useLocation();
  const navType = useNavigationType();
  useEffect(() => {
    if (navType === 'PUSH') window.scrollTo(0, 0);
  }, [pathname, navType]);
  return null;
}

function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
      <CartProvider>
        <Layout>
          <ScrollManager />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/menu" element={<Menu />} />
            <Route path="/music" element={<Music />} />
            <Route path="/events" element={<Events />} />
            <Route path="/shop" element={<Shop />} />
            <Route path="/shop/:handle" element={<ShopProduct />} />
            <Route path="/notices" element={<Notices />} />
            <Route path="/notices/:handle" element={<NoticeDetail />} />
            <Route path="/faq" element={<FAQ />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/refund" element={<Refund />} />
            <Route path="/points" element={<Points />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/account" element={<Account />} />
            <Route path="/contact" element={<Contact />} />
          </Routes>
        </Layout>
      </CartProvider>
      </AuthProvider>
    </LanguageProvider>
  )
}

export default App
