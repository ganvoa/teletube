import React from 'react';
import { List, Input, Button, Drawer, Menu, Typography, Dropdown, Empty, Row, Col } from 'antd';
import { DeleteFilled, CaretRightOutlined, MoreOutlined } from '@ant-design/icons';

const { Search } = Input;

class YoutubeSearch extends React.Component {

    menu = (item) => (
        <Menu>
            <Menu.Item
                key={0}
                onClick={() => {
                    console.log(item);
                }}
            >
                <DeleteFilled />
                Delete
            </Menu.Item>
        </Menu>
    );

    constructor(props) {
        super(props);
        this.state = {
            loading: false,
            query: null,
            youtubeLoading: false,
            youtubeError: null,
            searchResult: []
        };
    }

    componentDidMount() {
        const { ipcRenderer } = window.require('electron');
        
        ipcRenderer.on(`ui-youtube-search-result`, (e, results) => {
            this.setState({
                searchResult: results, 
                youtubeLoading: false,
                youtubeError: null
            });
        })

        ipcRenderer.on(`ui-youtube-search-error`, (e, message) => {
            this.setState({
                searchResult: [], 
                youtubeLoading: false,
                youtubeError: message
            });
        })
    }

    onSearch = query => {
        const { ipcRenderer } = window.require('electron');
        if (query !== '') {
            this.setState({youtubeLoading: true})
            ipcRenderer.send(`ui-search-youtube`, query);
        } else {
            this.setState({
                searchResult: [], 
                youtubeLoading: false,
                youtubeError: 'Search something'
            });
        }
    }

    render() {
        return (
            <Drawer
                placement="left"
                title="Search on Youtube"
                width={400}
                closable={true}
                onClose={this.props.onCloseYoutubeSearch}
                footer={<div>footer</div>}
                visible={this.props.visible}
            >
                <Row>
                    <Col span={24}>
                    <Search
                        placeholder="Search"
                        disabled={this.state.youtubeLoading}
                        loading={this.state.youtubeLoading}
                        onSearch={this.onSearch.bind(this)}
                        style={{ width: '100%' }}
                    />
                    </Col>
                </Row>
                <Row style={{
                    marginLeft: -14,
                    marginRight: -24,
                    marginBottom: -24,
                    marginTop: 10,
                }}>
                    <Col span={24}>
                {this.state.searchResult.length > 0 ? (
                    <List
                            style={{
                                overflowY: 'auto',
                                height: 'calc(100vh - 164px)',
                                maxHeight: 'calc(100vh - 164px)',
                                minHeight: 'calc(100vh - 164px)'
                            }}
                        >
                            {this.state.searchResult.map(item =>
                                    <List.Item
                                        key={item.uid}
                                        className="tt-playlist-song"
                                        style={{ justifyContent: 'space-between' }}
                                    >
                                        <div style={{ width: 'calc(100% - 60px)' }}>
                                            <img
                                                alt=""
                                                src={item.thumbnails.medium.url}
                                                onClick={() => {
                                                    console.log(item);
                                                }}
                                                style={{
                                                    cursor: 'pointer',
                                                    width: 60,
                                                    marginRight: 20
                                                }}
                                            />
                                            <Typography.Text
                                                style={{
                                                    maxWidth: 'calc(100% - 90px)',
                                                    verticalAlign: 'middle'
                                                }}
                                                ellipsis
                                            >
                                                {item.title}
                                            </Typography.Text>
                                        </div>
                                        <div>
                                            <>
                                                <Button
                                                    shape="circle"
                                                    size="small"
                                                    className="tt-btn"
                                                    icon={<CaretRightOutlined />}
                                                    style={{ border: 'none' }}
                                                    onClick={() => {
                                                        console.log(item);
                                                    }}
                                                />
                                                <Dropdown overlay={this.menu(item)}>
                                                    <Button
                                                        className="tt-btn"
                                                        size={'small'}
                                                        icon={<MoreOutlined />}
                                                        type={'link'}
                                                    />
                                                </Dropdown>
                                            </>
                                        </div>
                                    </List.Item>
                            )}
                        </List>
                ) : (
                    <Row justify="space-around" align="middle" style={{ height: 'calc(100vh - 178px)' }}>
                        <Col>
                            <Empty description={this.state.youtubeError === null ? 'Search Something' : this.state.youtubeError} />
                        </Col>
                    </Row>
                )}
                </Col>
            </Row>
            </Drawer>
        );
    }
}

export default YoutubeSearch;
