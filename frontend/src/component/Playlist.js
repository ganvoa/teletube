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
    Switch,
    Popover,
    Input,
    Select
} from "antd";
import Shuffle from "../assets/svg/shuffle";
import playlistSvg from "../assets/svg/playlist.svg";

import {
    DeleteFilled,
    CaretRightOutlined,
    MoreOutlined,
    RetweetOutlined,
    LoadingOutlined,
    PlusOutlined,
    EditOutlined,
    CloseOutlined
} from "@ant-design/icons";

const Search = Input.Search;
const Option = Select.Option;
const CreatePlaylistContent = ({ error, isLoading, onSubmit }) => (
    <>
        <Search
            prefix={<EditOutlined />}
            placeholder="Playlist Name"
            onSearch={onSubmit}
            loading={isLoading}
            disabled={isLoading}
            enterButton={<PlusOutlined disabled={isLoading} />}
        />
        {error !== null ? (
            <div className="ant-form-item-error">{error}</div>
        ) : null}
    </>
);
const CreatePlaylistTitle = ({ disabled, onClose }) => (
    <div
        style={{
            justifyContent: "space-between",
            display: "flex"
        }}
    >
        <span>Create Playlist</span>
        <Button
            className="tt-btn"
            shape="circle"
            onClick={onClose}
            size="small"
            disabled={disabled}
            icon={<CloseOutlined />}
        ></Button>
    </div>
);
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
            playlist: null,
            playlists: [],
            shuffling: false,
            showCreatePlaylist: false,
            showLoadingCreatePlaylist: false,
            errorCreatePlaylist: null
        };
    }

    componentDidMount() {
        const { ipcRenderer } = window.require("electron");

        ipcRenderer.on(`playlist`, (e, playlist) => {
            console.log(`playlist`, playlist);
            this.onPlaylist(playlist);
        });

        ipcRenderer.on(`playlists`, (e, playlists) => {
            console.log(`playlists`, playlists);
            this.onPlaylists(playlists);
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

        ipcRenderer.on(`create-playlist-response`, (e, isSucces, msg) => {
            this.onResponseCreatePlaylist(isSucces, msg);
        });
    }

    onPlaylist(playlist) {
        this.setState({
            playlist: playlist
        });

        this.props.onPlaylist(playlist);
    }

    onPlaylists(playlists) {
        this.setState({
            playlists: playlists
        });
    }

    onPlaySelected(song) {
        console.log(`play ${song.title}`);
        const { ipcRenderer } = window.require("electron");
        ipcRenderer.send(`play-song`, song);
    }

    onDeleteSong(song) {
        console.log(`delete ${song.title}`);
        const { ipcRenderer } = window.require("electron");
        ipcRenderer.send(`delete-song`, this.state.playlist.uid, song);
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
        ipcRenderer.send(`shuffle-playlist`, this.state.playlist.uid);
    }

    showCreatePlaylist = () => {
        this.setState({
            showCreatePlaylist: true,
            errorCreatePlaylist: null
        });
    };

    hideCreatePlaylist = () => {
        this.setState({
            showCreatePlaylist: false
        });
    };

    onResponseCreatePlaylist = (isSuccess, msg) => {
        if (isSuccess) {
            this.setState({
                showCreatePlaylist: false,
                showLoadingCreatePlaylist: false,
                errorCreatePlaylist: null
            });
        } else {
            this.setState({
                showCreatePlaylist: true,
                showLoadingCreatePlaylist: false,
                errorCreatePlaylist: msg
            });
        }
    };

    onSubmitCreatePlaylist = playlistName => {
        this.setState({ showLoadingCreatePlaylist: true });
        const { ipcRenderer } = window.require("electron");
        ipcRenderer.send(`create-playlist`, playlistName);
        setTimeout(() => {
            this.setState({
                showLoadingCreatePlaylist: false,
                errorCreatePlaylist: "Invalid name!"
            });
        }, 1000);
    };

    onSelecttPlaylist = playlistId => {
        const { ipcRenderer } = window.require("electron");
        ipcRenderer.send(`select-playlist`, playlistId);
    };

    render() {
        return (
            <div>
                {this.state.playlists.length > 0 ? (
                    <PageHeader
                        title={
                            <>
                                <Select
                                    prefix={<EditOutlined />}
                                    defaultValue={""}
                                    value={
                                        this.state.playlist
                                            ? this.state.playlist.uid
                                            : ""
                                    }
                                    onChange={this.onSelecttPlaylist}
                                    bordered={false}
                                    style={{
                                        width: "calc(50vw - 200px)",
                                        fontSize: 20,
                                        color: "#e91e63"
                                    }}
                                    size="large"
                                >
                                    <Option key={0} value="" disabled>
                                        Select Playlist
                                    </Option>
                                    {this.state.playlists.map(item => (
                                        <Option key={item.uid} value={item.uid}>
                                            {item.name}
                                        </Option>
                                    ))}
                                </Select>
                            </>
                        }
                        subTitle={
                            this.state.playlist
                                ? `${this.state.playlist.tracks.length} song${
                                      this.state.playlist.tracks.length !== 1
                                          ? "s"
                                          : ""
                                  }`
                                : null
                        }
                        extra={
                            this.state.playlist === null
                                ? []
                                : [
                                      <Button
                                          key={0}
                                          shape="circle"
                                          className="tt-btn"
                                          disabled={
                                              this.state.playlist === null ||
                                              this.state.shuffling
                                          }
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
                                          style={{
                                              marginRight: 20,
                                              border: "none"
                                          }}
                                          onClick={this.onShuffleRequest.bind(
                                              this
                                          )}
                                      />,
                                      <Switch
                                          key={1}
                                          checkedChildren={<RetweetOutlined />}
                                          unCheckedChildren={
                                              <RetweetOutlined />
                                          }
                                          defaultChecked
                                          disabled={
                                              this.state.playlist === null
                                          }
                                          checked={this.props.loop}
                                          onClick={this.props.onLoopChange}
                                      />
                                  ]
                        }
                    />
                ) : null}
                {this.state.playlist &&
                this.state.playlist.tracks.length > 0 ? (
                    <List
                        style={{
                            overflowY: "auto",
                            height: "calc(100vh - 128px)",
                            maxHeight: "calc(100vh - 128px)",
                            minHeigh: "calc(100vh - 128px)"
                        }}
                        bordered
                        dataSource={this.state.playlist.tracks}
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
                ) : this.state.playlist === null ? (
                    <Row
                        justify="space-around"
                        align="middle"
                        style={{ height: "calc(100vh - 200px)" }}
                    >
                        <Col span={24}>
                            <Empty
                                image={playlistSvg}
                                description={"Select or Create a Playlist"}
                            >
                                <Popover
                                    visible={this.state.showCreatePlaylist}
                                    content={
                                        <CreatePlaylistContent
                                            onSubmit={
                                                this.onSubmitCreatePlaylist
                                            }
                                            error={
                                                this.state.errorCreatePlaylist
                                            }
                                            isLoading={
                                                this.state
                                                    .showLoadingCreatePlaylist
                                            }
                                        />
                                    }
                                    title={
                                        <CreatePlaylistTitle
                                            disabled={
                                                this.state
                                                    .showLoadingCreatePlaylist
                                            }
                                            onClose={this.hideCreatePlaylist}
                                        />
                                    }
                                    trigger="click"
                                    placement="bottom"
                                >
                                    <Button
                                        type={"primary"}
                                        icon={<PlusOutlined />}
                                        onClick={this.showCreatePlaylist}
                                    >
                                        Create Playlist
                                    </Button>
                                </Popover>
                            </Empty>
                        </Col>
                    </Row>
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
