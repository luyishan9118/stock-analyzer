import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Layout, Menu, Button, Space, Popover } from 'antd';
import { LineChartOutlined, CoffeeOutlined, HeartOutlined, MessageOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import StockAnalyzer from './components/StockAnalyzer';
import LanguageSelector from './components/LanguageSelector';
import './App.css';

const { Header, Content, Footer } = Layout;

// Replace with your Venmo username
const VENMO_USERNAME = 'luyishan';

function App() {
  const { t } = useTranslation();

  return (
    <Router>
      <Layout style={{ minHeight: '100vh' }}>
        <Header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ color: 'white', fontSize: '18px', whiteSpace: 'nowrap' }}>
              <LineChartOutlined /> {t('app.title')}
            </div>
            <Menu
              theme="dark"
              mode="horizontal"
              defaultSelectedKeys={['1']}
              items={[
                {
                  key: '1',
                  label: <Link to="/">Analyzer</Link>,
                },
              ]}
              style={{ minWidth: '0' }}
            />
          </div>
          <div style={{ marginLeft: 'auto' }}>
            <LanguageSelector />
          </div>
        </Header>
        <Content style={{ padding: '0 16px', marginTop: 16 }}>
          <Routes>
            <Route path="/" element={<StockAnalyzer />} />
          </Routes>
        </Content>
        <Footer style={{ textAlign: 'center', padding: '24px' }}>
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Space size="middle">
              <Popover
                content={
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '14px', marginBottom: '12px', fontWeight: '500' }}>
                      {t('venmo.scanQR')}
                    </div>
                    <img
                      src="/venmo-qr-code.png"
                      alt="Venmo QR Code"
                      style={{
                        width: '200px',
                        height: '200px',
                        border: '2px solid #ddd',
                        borderRadius: '8px',
                        padding: '8px',
                        background: 'white'
                      }}
                    />
                    <div style={{ fontSize: '12px', marginTop: '12px', color: '#666' }}>
                      @{VENMO_USERNAME}
                    </div>
                  </div>
                }
                title={null}
                trigger="hover"
                placement="top"
              >
                <Button
                  type="primary"
                  icon={<CoffeeOutlined />}
                  size="large"
                  href={`https://venmo.com/${VENMO_USERNAME}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ background: '#008CFF', borderColor: '#008CFF' }}
                  onClick={(e) => {
                    // Allow hover to work on mobile
                    if (window.innerWidth <= 768) {
                      e.preventDefault();
                    }
                  }}
                >
                  {t('buttons.buyMeCoffee')}
                </Button>
              </Popover>

              <Button
                icon={<MessageOutlined />}
                size="large"
                href={`mailto:luyishanchn@gmail.com?subject=${encodeURIComponent(t('email.subject'))}&body=${encodeURIComponent(t('email.body'))}`}
              >
                {t('buttons.giveFeedback')}
              </Button>
            </Space>
            <div style={{ fontSize: '12px', color: '#888' }}>
              <HeartOutlined /> {t('app.support')} • {t('app.copyright')}
            </div>
          </Space>
        </Footer>
      </Layout>
    </Router>
  );
}

export default App;
