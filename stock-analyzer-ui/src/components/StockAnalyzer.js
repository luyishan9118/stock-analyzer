import React, { useState, useEffect } from 'react';
import { Input, Button, Card, Space, Typography, Alert, Tag, Row, Col, Divider, Statistic, Tooltip, Dropdown, Modal, message, Popover } from 'antd';
import { InfoCircleOutlined, StarOutlined, PlusOutlined, EditOutlined, DeleteOutlined, DownOutlined, CoffeeOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { analyzeStocks } from '../utils/stockAnalysis';

const { Title, Text } = Typography;

// Venmo username
const VENMO_USERNAME = 'luyishan';

const StockAnalyzer = () => {
    const { t } = useTranslation();
    const [stockInput, setStockInput] = useState('TSLA, VOO, QQQ');
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState([]);
    const [error, setError] = useState(null);

    // Observation lists state
    const [observationLists, setObservationLists] = useState([]);
    const [selectedListName, setSelectedListName] = useState(null);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingList, setEditingList] = useState(null);
    const [newListName, setNewListName] = useState('');
    const [newListStocks, setNewListStocks] = useState('');

    // Load observation lists from localStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem('observationLists');
        if (saved) {
            setObservationLists(JSON.parse(saved));
        } else {
            // Set default lists
            const defaultLists = [
                { id: 1, name: t('messages.defaultWatchlist'), stocks: 'TSLA, VOO, QQQ' },
            ];
            setObservationLists(defaultLists);
            localStorage.setItem('observationLists', JSON.stringify(defaultLists));
        }
    }, [t]);

    // Save observation lists to localStorage whenever they change
    useEffect(() => {
        if (observationLists.length > 0) {
            localStorage.setItem('observationLists', JSON.stringify(observationLists));
        }
    }, [observationLists]);

    const handleAnalyze = async () => {
        const tickers = stockInput
            .split(',')
            .map(ticker => ticker.trim().toUpperCase())
            .filter(ticker => ticker.length > 0);

        if (tickers.length === 0) {
            setError(t('messages.enterAtLeastOne'));
            return;
        }

        setLoading(true);
        setError(null);
        setResults([]);

        try {
            const analysisResults = await analyzeStocks(tickers);
            setResults(analysisResults);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        setLoading(false);
        setResults([]);
        setError(null);
    };

    const handleSelectList = (list) => {
        setStockInput(list.stocks);
        setSelectedListName(list.name);
        message.success(`${t('messages.loaded')} "${list.name}"`);
    };

    const handleCreateList = () => {
        setEditingList(null);
        setNewListName('');
        setNewListStocks('');
        setIsModalVisible(true);
    };

    const handleEditList = (list) => {
        setEditingList(list);
        setNewListName(list.name);
        setNewListStocks(list.stocks);
        setIsModalVisible(true);
    };

    const handleDeleteList = (listId) => {
        Modal.confirm({
            title: t('modal.deleteTitle'),
            content: t('modal.deleteConfirm'),
            onOk: () => {
                const deletedList = observationLists.find(list => list.id === listId);
                setObservationLists(observationLists.filter(list => list.id !== listId));
                // Clear selected list name if the deleted list was selected
                if (deletedList && selectedListName === deletedList.name) {
                    setSelectedListName(null);
                }
                message.success(t('messages.listDeleted'));
            },
        });
    };

    const handleSaveList = () => {
        if (!newListName.trim()) {
            message.error(t('messages.enterListName'));
            return;
        }

        if (!newListStocks.trim()) {
            message.error(t('messages.enterTickers'));
            return;
        }

        if (editingList) {
            // Update existing list
            setObservationLists(observationLists.map(list =>
                list.id === editingList.id
                    ? { ...list, name: newListName, stocks: newListStocks }
                    : list
            ));
            message.success(t('messages.listUpdated'));
        } else {
            // Create new list
            const newList = {
                id: Date.now(),
                name: newListName,
                stocks: newListStocks,
            };
            setObservationLists([...observationLists, newList]);
            message.success(t('messages.listCreated'));
        }

        setIsModalVisible(false);
        setEditingList(null);
        setNewListName('');
        setNewListStocks('');
    };

    const getRecommendationColor = (recommendation) => {
        switch (recommendation) {
            case 'STRONG BUY':
                return 'green';
            case 'MODERATE BUY':
                return 'gold';
            case 'HOLD':
                return 'orange';
            case 'AVOID':
                return 'red';
            default:
                return 'default';
        }
    };

    const translateRecommendation = (recommendation) => {
        switch (recommendation) {
            case 'STRONG BUY':
                return t('recommendations.strongBuy');
            case 'MODERATE BUY':
                return t('recommendations.moderateBuy');
            case 'HOLD':
                return t('recommendations.hold');
            case 'AVOID':
                return t('recommendations.avoid');
            default:
                return recommendation;
        }
    };

    const sortedResults = [...results].sort((a, b) => b.score - a.score);

    const dropdownItems = [
        ...observationLists.map(list => ({
            key: list.id,
            label: (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', minWidth: '250px' }}>
                    <span onClick={() => handleSelectList(list)} style={{ flex: 1 }}>
                        {list.name}
                    </span>
                    <Space size="small">
                        <EditOutlined onClick={(e) => { e.stopPropagation(); handleEditList(list); }} />
                        <DeleteOutlined onClick={(e) => { e.stopPropagation(); handleDeleteList(list.id); }} />
                    </Space>
                </div>
            ),
        })),
        {
            type: 'divider',
        },
        {
            key: 'create',
            label: (
                <div onClick={handleCreateList}>
                    <PlusOutlined /> {t('buttons.createNewList')}
                </div>
            ),
        },
    ];

    return (
        <div style={{ padding: '8px' }}>
            <Card style={{ width: '100%' }}>
                <Space direction="vertical" size="large" style={{ width: '100%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                        <Title level={2} style={{ margin: 0, fontSize: 'clamp(18px, 5vw, 24px)' }}>{t('app.title')}</Title>
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
                            placement="bottom"
                        >
                            <Button
                                type="primary"
                                icon={<CoffeeOutlined />}
                                href={`https://venmo.com/${VENMO_USERNAME}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ background: '#008CFF', borderColor: '#008CFF' }}
                                onClick={(e) => {
                                    if (window.innerWidth <= 768) {
                                        e.preventDefault();
                                    }
                                }}
                            >
                                {t('buttons.buyMeCoffee')}
                            </Button>
                        </Popover>
                    </div>

                    <Space size="middle" wrap style={{ width: '100%' }}>
                        <Dropdown menu={{ items: dropdownItems }} trigger={['click']}>
                            <Button icon={<StarOutlined />} style={{ width: '100%', minWidth: '200px' }}>
                                {selectedListName || t('buttons.observationLists')} <DownOutlined />
                            </Button>
                        </Dropdown>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: '1', minWidth: '200px' }}>
                            <Input
                                style={{ width: '100%' }}
                                placeholder={t('input.placeholder')}
                                value={stockInput}
                                onChange={(e) => {
                                    setStockInput(e.target.value);
                                    // Clear selected list name when manually editing
                                    if (selectedListName) {
                                        setSelectedListName(null);
                                    }
                                }}
                                onPressEnter={handleAnalyze}
                            />
                            <Tooltip title={<div style={{ whiteSpace: 'pre-line' }}>{t('tooltips.stockInput')}</div>}>
                                <InfoCircleOutlined style={{ fontSize: '16px', color: '#1890ff', cursor: 'help' }} />
                            </Tooltip>
                        </div>

                        <Button
                            type="primary"
                            onClick={handleAnalyze}
                            loading={loading}
                            disabled={!stockInput || stockInput.trim().length === 0}
                            style={{ minWidth: '100px' }}
                        >
                            {t('buttons.analyze')}
                        </Button>

                        <Button onClick={handleCancel} disabled={!loading && results.length === 0} style={{ minWidth: '100px' }}>
                            {t('buttons.cancel')}
                        </Button>
                    </Space>

                    {error && (
                        <Alert message={t('alerts.error')} description={error} type="error" closable />
                    )}

                    {results.length > 0 && (
                        <>
                            <Alert
                                message={t('alerts.disclaimer')}
                                description={t('alerts.disclaimerText')}
                                type="warning"
                                closable
                            />

                            <Row gutter={[16, 16]}>
                                {sortedResults.map((stock) => (
                                    <Col xs={24} sm={24} md={12} lg={8} key={stock.ticker}>
                                        <Card
                                            title={
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <Text strong style={{ fontSize: '20px' }}>{stock.ticker}</Text>
                                                    <Tag color={getRecommendationColor(stock.recommendation)}>
                                                        {translateRecommendation(stock.recommendation)}
                                                    </Tag>
                                                </div>
                                            }
                                            bordered
                                            style={{ height: '100%', borderColor: '#d9d9d9', borderWidth: '2px' }}
                                        >
                                            <Space direction="vertical" size="small" style={{ width: '100%' }}>
                                                <Row gutter={16}>
                                                    <Col span={12}>
                                                        <Statistic
                                                            title={t('results.currentPrice')}
                                                            value={stock.currentPrice}
                                                            prefix="$"
                                                            valueStyle={{ fontSize: '18px' }}
                                                        />
                                                    </Col>
                                                    <Col span={12}>
                                                        <Statistic
                                                            title={t('results.buySignal')}
                                                            value={stock.score}
                                                            suffix="%"
                                                            valueStyle={{
                                                                fontSize: '18px',
                                                                color: stock.score >= 75 ? '#3f8600' : stock.score >= 50 ? '#faad14' : stock.score >= 25 ? '#fa8c16' : '#cf1322'
                                                            }}
                                                        />
                                                    </Col>
                                                </Row>

                                                <Divider style={{ margin: '12px 0' }} />

                                                <div>
                                                    <Text strong>{t('results.signals')}: </Text>
                                                    <Text>{stock.signals || t('results.none')}</Text>
                                                </div>

                                                <Divider style={{ margin: '12px 0' }}>{t('results.technicalIndicators')}</Divider>

                                                <Row gutter={8}>
                                                    <Col span={8}>
                                                        <Text type="secondary">
                                                            RSI{' '}
                                                            <Tooltip title={t('tooltips.rsi')}>
                                                                <InfoCircleOutlined style={{ fontSize: '12px' }} />
                                                            </Tooltip>
                                                            :
                                                        </Text><br />
                                                        <Text strong>{stock.rsi || '-'}</Text>
                                                    </Col>
                                                    <Col span={8}>
                                                        <Text type="secondary">
                                                            MACD{' '}
                                                            <Tooltip title={t('tooltips.macd')}>
                                                                <InfoCircleOutlined style={{ fontSize: '12px' }} />
                                                            </Tooltip>
                                                            :
                                                        </Text><br />
                                                        <Text strong>{stock.macd || '-'}</Text>
                                                    </Col>
                                                    <Col span={8}>
                                                        <Text type="secondary">
                                                            BB Pos{' '}
                                                            <Tooltip title={t('tooltips.bbPosition')}>
                                                                <InfoCircleOutlined style={{ fontSize: '12px' }} />
                                                            </Tooltip>
                                                            :
                                                        </Text><br />
                                                        <Text strong>{stock.bbPosition ? `${stock.bbPosition}%` : '-'}</Text>
                                                    </Col>
                                                </Row>

                                                <Divider style={{ margin: '12px 0' }}>{t('results.movingAverages')}</Divider>

                                                <Row gutter={8}>
                                                    <Col span={8}>
                                                        <Text type="secondary">20-day:</Text><br />
                                                        <Text strong>${stock.sma20 || '-'}</Text>
                                                    </Col>
                                                    <Col span={8}>
                                                        <Text type="secondary">50-day:</Text><br />
                                                        <Text strong>${stock.sma50 || '-'}</Text>
                                                    </Col>
                                                    <Col span={8}>
                                                        <Text type="secondary">200-day:</Text><br />
                                                        <Text strong>${stock.sma200 || '-'}</Text>
                                                    </Col>
                                                </Row>

                                                <Divider style={{ margin: '12px 0' }}>{t('results.bollingerBands')}</Divider>

                                                <Row gutter={8}>
                                                    <Col span={12}>
                                                        <Text type="secondary">{t('results.upper')}:</Text><br />
                                                        <Text strong>${stock.bbUpper || '-'}</Text>
                                                    </Col>
                                                    <Col span={12}>
                                                        <Text type="secondary">{t('results.lower')}:</Text><br />
                                                        <Text strong>${stock.bbLower || '-'}</Text>
                                                    </Col>
                                                </Row>

                                                <Divider style={{ margin: '12px 0' }}>{t('results.volume')}</Divider>

                                                <Row gutter={8}>
                                                    <Col span={8}>
                                                        <Text type="secondary">{t('results.current')}:</Text><br />
                                                        <Text strong>{stock.volume}</Text>
                                                    </Col>
                                                    <Col span={8}>
                                                        <Text type="secondary">{t('results.avg')}:</Text><br />
                                                        <Text strong>{stock.avgVolume}</Text>
                                                    </Col>
                                                    <Col span={8}>
                                                        <Text type="secondary">
                                                            {t('results.ratio')}{' '}
                                                            <Tooltip title={t('tooltips.volumeRatio')}>
                                                                <InfoCircleOutlined style={{ fontSize: '12px' }} />
                                                            </Tooltip>
                                                            :
                                                        </Text><br />
                                                        <Text strong>{stock.volumeRatio}x</Text>
                                                    </Col>
                                                </Row>

                                                <Divider style={{ margin: '12px 0' }}>{t('results.week52Range')}</Divider>

                                                <Row gutter={8}>
                                                    <Col span={12}>
                                                        <Text type="secondary">{t('results.high')}:</Text><br />
                                                        <Text strong>${stock.week52High || '-'}</Text>
                                                        <br />
                                                        <Text type="secondary" style={{ fontSize: '12px' }}>
                                                            ({stock.distanceFromHigh}% {t('results.below')})
                                                        </Text>
                                                    </Col>
                                                    <Col span={12}>
                                                        <Text type="secondary">{t('results.low')}:</Text><br />
                                                        <Text strong>${stock.week52Low || '-'}</Text>
                                                        <br />
                                                        <Text type="secondary" style={{ fontSize: '12px' }}>
                                                            ({stock.distanceFromLow}% {t('results.above')})
                                                        </Text>
                                                    </Col>
                                                </Row>

                                                <Divider style={{ margin: '12px 0' }}>{t('results.supportResistance')}</Divider>

                                                <div>
                                                    <Text type="secondary">
                                                        {t('results.support')}{' '}
                                                        <Tooltip title={t('tooltips.support')}>
                                                            <InfoCircleOutlined style={{ fontSize: '12px' }} />
                                                        </Tooltip>
                                                        :{' '}
                                                    </Text>
                                                    <Text strong>{stock.support || t('results.none')}</Text>
                                                </div>
                                                <div style={{ marginTop: '8px' }}>
                                                    <Text type="secondary">
                                                        {t('results.resistance')}{' '}
                                                        <Tooltip title={t('tooltips.resistance')}>
                                                            <InfoCircleOutlined style={{ fontSize: '12px' }} />
                                                        </Tooltip>
                                                        :{' '}
                                                    </Text>
                                                    <Text strong>{stock.resistance || t('results.none')}</Text>
                                                </div>
                                            </Space>
                                        </Card>
                                    </Col>
                                ))}
                            </Row>
                        </>
                    )}
                </Space>
            </Card>

            {/* Modal for creating/editing observation lists */}
            <Modal
                title={editingList ? t('modal.editList') : t('modal.createList')}
                open={isModalVisible}
                onOk={handleSaveList}
                onCancel={() => {
                    setIsModalVisible(false);
                    setEditingList(null);
                    setNewListName('');
                    setNewListStocks('');
                }}
                okText={t('buttons.save')}
            >
                <Space direction="vertical" style={{ width: '100%' }}>
                    <div>
                        <Text strong>{t('input.listName')}:</Text>
                        <Input
                            placeholder={t('input.listNamePlaceholder')}
                            value={newListName}
                            onChange={(e) => setNewListName(e.target.value)}
                            style={{ marginTop: '8px' }}
                        />
                    </div>
                    <div style={{ marginTop: '16px' }}>
                        <Text strong>{t('input.stockTickers')}:</Text>
                        <Input.TextArea
                            placeholder={t('input.stockTickersPlaceholder')}
                            value={newListStocks}
                            onChange={(e) => setNewListStocks(e.target.value)}
                            rows={4}
                            style={{ marginTop: '8px' }}
                        />
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                            {t('input.separateWithCommas')}
                        </Text>
                    </div>
                </Space>
            </Modal>
        </div>
    );
};

export default StockAnalyzer;
