import React from 'react';
import { Select } from 'antd';
import { useTranslation } from 'react-i18next';
import { GlobalOutlined } from '@ant-design/icons';

const { Option } = Select;

const LanguageSelector = () => {
    const { i18n } = useTranslation();

    const languages = [
        { code: 'en', label: 'English', flag: '🇺🇸' },
        { code: 'zh-CN', label: '简体中文', flag: '🇨🇳' },
        { code: 'zh-TW', label: '繁體中文', flag: '🇹🇼' },
        { code: 'ko', label: '한국어', flag: '🇰🇷' },
        { code: 'ja', label: '日本語', flag: '🇯🇵' },
        { code: 'fr', label: 'Français', flag: '🇫🇷' },
        { code: 'es', label: 'Español', flag: '🇲🇽' },
        { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
    ];

    const handleChange = (value) => {
        i18n.changeLanguage(value);
        localStorage.setItem('language', value);
    };

    return (
        <Select
            value={i18n.language}
            onChange={handleChange}
            style={{ width: '100%', minWidth: '140px', maxWidth: '180px' }}
            suffixIcon={<GlobalOutlined />}
        >
            {languages.map((lang) => (
                <Option key={lang.code} value={lang.code}>
                    <span style={{ marginRight: '8px' }}>{lang.flag}</span>
                    {lang.label}
                </Option>
            ))}
        </Select>
    );
};

export default LanguageSelector;
