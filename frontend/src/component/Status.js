import React from "react";
import { PageHeader, Tag, Drawer, Button } from "antd";
import {
    DesktopOutlined,
    SoundOutlined,
    LoadingOutlined,
    SettingOutlined
} from "@ant-design/icons";
import Config from "./Config";

class Status extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            showDevices: false,
            configVisible: false,
            youtubeChannel: null,
            currentConfig: null
        };
    }

    componentDidMount() {
        const { ipcRenderer } = window.require("electron");

        ipcRenderer.on(`set-youtube-channel`, (e, youtubeChannel) => {
            this.setState({
                youtubeChannel: youtubeChannel
            });
        });
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

    onConfigUpdate(config) {
        this.setState({
            currentConfig: config
        });
    }

    render() {
        return (
            <div>
                <Config
                    visible={this.state.configVisible}
                    onConfigUpdate={this.onConfigUpdate.bind(this)}
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
                    title={
                        this.state.youtubeChannel != null
                            ? this.state.youtubeChannel.title
                            : ""
                    }
                    avatar={{
                        src:
                            this.state.youtubeChannel != null
                                ? this.state.youtubeChannel.thumbnails.medium
                                      .url
                                : ""
                    }}
                    tags={this.state.currentConfig != null && this.state.currentConfig.telegramBotTokenValid ? <Tag color="green">Bot Running</Tag> : <Tag color="red">Bot Stopped</Tag>}
                    extra={[
                        <Button
                            key={0}
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
                            style={{ border: "none" }}
                            onClick={this.showDevices.bind(this)}
                        />
                    ]}
                />
            </div>
        );
    }
}

export default Status;
