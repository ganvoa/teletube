import React from "react";
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
    Switch
} from "antd";

import Shuffle from "../assets/svg/shuffle";

import {
    DeleteFilled,
    CaretRightOutlined,
    MoreOutlined,
    RetweetOutlined,
    LoadingOutlined
} from "@ant-design/icons";
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
        </Menu>
    );

    constructor(props) {
        super(props);
        this.state = {
            playlist: [],
            shuffling: false
        };
    }

    componentDidMount() {
        const { ipcRenderer } = window.require("electron");

        ipcRenderer.on(`playlist`, (e, playlist) => {
            this.onPlaylist(playlist);
        });

        ipcRenderer.on(`shuffle-start`, e => {
            this.setState({
                shuffling: true
            });
        });

        ipcRenderer.on(`shuffle-end`, e => {
            this.setState({
                shuffling: false
            });
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

    onShuffleEnd() {
        this.setState({
            shuffling: false
        });
    }

    onShuffleRequest() {
        this.setState({
            shuffling: true
        });
        const { ipcRenderer } = window.require("electron");
        ipcRenderer.send(`shuffle-playlist`, {});
    }

    render() {
        return (
            <div>
                <PageHeader
                    title="Playlist"
                    subTitle={`${this.state.playlist.length} song${
                        this.state.playlist.length !== 1 ? "s" : ""
                    }`}
                    extra={[
                        <Button
                            key={0}
                            shape="circle"
                            className="tt-btn"
                            disabled={this.state.shuffling}
                            icon={
                                this.state.shuffling ? (
                                    <LoadingOutlined
                                        style={{
                                            color: "#e91e63"
                                        }}
                                    />
                                ) : (
                                    <Shuffle />
                                )
                            }
                            style={{ marginRight: 20, border: "none" }}
                            onClick={this.onShuffleRequest.bind(this)}
                        />,
                        <Switch
                            key={1}
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
                            height: "calc(100vh - 128px)",
                            maxHeight: "calc(100vh - 128px)",
                            minHeigh: "calc(100vh - 128px)"
                        }}
                        bordered
                        dataSource={this.state.playlist}
                        renderItem={item => (
                            <List.Item
                                className={
                                    this.props.currentSong &&
                                    this.props.currentSong.uid === item.uid
                                        ? "tt-playlist-song tt-current-playlist-song "
                                        : "tt-playlist-song"
                                }
                                style={{ justifyContent: "space-between" }}
                            >
                                <div style={{ width: "calc(100% - 60px)" }}>
                                    <img
                                        alt=""
                                        src={item.thumbnails.medium.url}
                                        onClick={() => {
                                            this.onPlaySelected(item);
                                        }}
                                        style={{
                                            cursor: "pointer",
                                            width: 60,
                                            marginRight: 20
                                        }}
                                    />
                                    {this.props.currentSong &&
                                    this.props.currentSong.uid === item.uid ? (
                                        <Typography.Text
                                            strong
                                            ellipsis
                                            style={{
                                                maxWidth: "calc(100% - 90px)",
                                                color: "#e91e63"
                                            }}
                                        >
                                            {item.title}
                                        </Typography.Text>
                                    ) : (
                                        <Typography.Text
                                            style={{
                                                maxWidth: "calc(100% - 90px)"
                                            }}
                                            ellipsis
                                        >
                                            {item.title}
                                        </Typography.Text>
                                    )}
                                </div>
                                <div>
                                    <Button
                                        shape="circle"
                                        size="small"
                                        className="tt-btn"
                                        icon={<CaretRightOutlined />}
                                        style={{ border: "none" }}
                                        onClick={() => {
                                            this.onPlaySelected(item);
                                        }}
                                    />
                                    <Dropdown
                                        overlay={this.menu(
                                            this.props.currentSong,
                                            item
                                        )}
                                    >
                                        <Button
                                            className="tt-btn"
                                            size={"small"}
                                            icon={<MoreOutlined />}
                                            type={"link"}
                                        />
                                    </Dropdown>
                                </div>
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
