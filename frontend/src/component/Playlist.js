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
import {
    DeleteFilled,
    CaretRightOutlined,
    MoreOutlined,
    RetweetOutlined
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

    render() {
        return (
            <div>
                <PageHeader
                    title="Playlist"
                    subTitle={`${this.state.playlist.length} song${
                        this.state.playlist.length !== 1 ? "s" : ""
                    }`}
                    extra={[
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
                            height: "calc(100vh - 128px)",
                            maxHeight: "calc(100vh - 128px)",
                            minHeigh: "calc(100vh - 128px)"
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
