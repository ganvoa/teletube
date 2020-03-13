import React from "react";
import "../assets/scrollbar.css";
import {
    Row,
    Col,
    PageHeader,
    Empty,
    List,
    Typography,
    Dropdown,
    Menu,
    Button,
    Switch,
    Drawer
} from "antd";
import {
    DeleteFilled,
    CaretRightOutlined,
    MoreOutlined,
    RetweetOutlined,
    DesktopOutlined,
    SoundOutlined,
    LoadingOutlined,
    SettingOutlined
} from "@ant-design/icons";
import Config from "./Config";

class Playlist extends React.Component {
    menu = (currentSong, song) => (
        <Menu>
            <Menu.Item
                key="1"
                disabled={
                    currentSong && currentSong.uid === song.uid ? true : false
                }
                onClick={() => {
                    this.onDeleteSong(song);
                }}
            >
                <DeleteFilled />
                Delete
            </Menu.Item>
            <Menu.Item
                key="2"
                onClick={() => {
                    this.onPlaySelected(song);
                }}
            >
                <CaretRightOutlined />
                Play
            </Menu.Item>
        </Menu>
    );

    constructor(props) {
        super(props);
        this.state = {
            showDevices: false,
            configVisible: false,
            playlist: []
        };
    }

    componentDidMount() {
        const { ipcRenderer } = window.require("electron");
        ipcRenderer.on(`playlist`, (e, playlist) => {
            this.onPlaylist(playlist);
        });
    }

    onPlaylist(playlist) {
        this.setState({
            playlist: playlist
        });

        this.props.onPlaylist(playlist);
    }

    onPlaySelected(song) {
        console.log(`play ${song.title}`);
        const { ipcRenderer } = window.require("electron");
        ipcRenderer.send(`play-song`, song);
    }

    onDeleteSong(song) {
        console.log(`delete ${song.title}`);
        const { ipcRenderer } = window.require("electron");
        ipcRenderer.send(`delete-song`, song);
    }

    showDevices() {
        this.setState({
            showDevices: true
        });
    }

    hideDevices() {
        this.setState({
            showDevices: false
        });
    }

    onDeviceSelect(device) {
        this.props.onSelectDevice(device);
    }

    onDisconnectDevice() {
        if (this.props.device) this.props.onDisconnectDevice();
    }

    onCloseConfig() {
        this.setState({
            configVisible: false
        });
    }

    render() {
        return (
            <div>
                <Config
                    visible={this.state.configVisible}
                    onCloseConfig={this.onCloseConfig.bind(this)}
                />
                <Drawer
                    title="Select Device"
                    placement="right"
                    closable={true}
                    onClose={this.hideDevices.bind(this)}
                    visible={this.state.showDevices}
                >
                    {this.props.devices.map(el => (
                        <p
                            key={el.name}
                            style={{
                                cursor: "pointer",
                                color:
                                    this.props.device &&
                                    this.props.device.name === el.name
                                        ? "#e91e63"
                                        : null
                            }}
                            onClick={() => {
                                if (this.props.device)
                                    this.onDisconnectDevice();
                                else this.onDeviceSelect(el);
                            }}
                        >
                            {this.props.loadingDevice ? (
                                <LoadingOutlined style={{ marginRight: 10 }} />
                            ) : null}
                            {!this.props.loadingDevice &&
                            this.props.device &&
                            this.props.device.name === el.name ? (
                                <SoundOutlined style={{ marginRight: 10 }} />
                            ) : null}
                            {el.friendlyName}
                        </p>
                    ))}
                </Drawer>
                <PageHeader
                    title="Playlist"
                    subTitle={`${this.state.playlist.length} song${
                        this.state.playlist.length !== 1 ? "s" : ""
                    }`}
                    extra={[
                        <Button
                            key={2}
                            shape="circle"
                            icon={<SettingOutlined />}
                            style={{ marginRight: 10, border: "none" }}
                            onClick={() => {
                                this.setState({ configVisible: true });
                            }}
                        />,
                        <Button
                            key={1}
                            disabled={this.props.devices.length < 1}
                            shape="circle"
                            icon={
                                this.props.loadingDevice ? (
                                    <LoadingOutlined />
                                ) : (
                                    <DesktopOutlined
                                        style={{
                                            color: this.props.device
                                                ? "#e91e63"
                                                : null
                                        }}
                                    />
                                )
                            }
                            style={{ marginRight: 20, border: "none" }}
                            onClick={this.showDevices.bind(this)}
                        />,
                        <Switch
                            key={0}
                            checkedChildren={<RetweetOutlined />}
                            unCheckedChildren={<RetweetOutlined />}
                            defaultChecked
                            checked={this.props.loop}
                            onClick={this.props.onLoopChange}
                        />
                    ]}
                />
                {this.state.playlist.length > 0 ? (
                    <List
                        style={{
                            overflowY: "auto",
                            height: "calc(100vh - 64px)",
                            maxHeight: "calc(100vh - 64px)",
                            minHeigh: "calc(100vh - 64px)"
                        }}
                        bordered
                        dataSource={this.state.playlist}
                        renderItem={item => (
                            <List.Item style={{ justifyContent: "start" }}>
                                <img
                                    alt=""
                                    src={item.thumbnails.medium.url}
                                    onClick={() => {
                                        this.onPlaySelected(item);
                                    }}
                                    style={{ cursor: "pointer", width: 60 }}
                                />
                                <Dropdown
                                    overlay={this.menu(
                                        this.props.currentSong,
                                        item
                                    )}
                                >
                                    <Button size={"small"} type={"link"}>
                                        <MoreOutlined />
                                    </Button>
                                </Dropdown>
                                {this.props.currentSong &&
                                this.props.currentSong.uid === item.uid ? (
                                    <Typography.Text
                                        strong
                                        ellipsis
                                        style={{
                                            maxWidth: 310,
                                            color: "#e91e63"
                                        }}
                                    >
                                        {item.title}
                                    </Typography.Text>
                                ) : (
                                    <Typography.Text
                                        style={{ maxWidth: 310 }}
                                        ellipsis
                                    >
                                        {item.title}
                                    </Typography.Text>
                                )}
                            </List.Item>
                        )}
                    />
                ) : (
                    <Row
                        justify="space-around"
                        align="middle"
                        style={{ height: 300 }}
                    >
                        <Col>
                            <Empty description={"The playlist is empty"} />
                        </Col>
                    </Row>
                )}
            </div>
        );
    }
}

export default Playlist;
