import React from "react";
import { Form, Input, Button, Drawer } from "antd";
import {
    LoadingOutlined,
    CheckCircleTwoTone,
    CloseCircleTwoTone
} from "@ant-design/icons";

class Config extends React.Component {
    constructor(props) {
        super(props);
        this.form = null;
        this.state = {
            loading: true,
            showForm: false,
            config: {
                telegramBotTokenValid: false,
                telegramBotToken: null
            }
        };
    }

    componentDidMount() {
        const { ipcRenderer } = window.require("electron");
        ipcRenderer.send(`load-config`, {});
        ipcRenderer.on(`config-update`, (e, config) => {
            console.log(`config-update`);
            this.setState(
                {
                    config: config,
                    loading: false
                },
                () => {
                    this.props.onConfigUpdate(config);
                }
            );
            this.closeForm();
        });
    }

    closeForm = () => {
        this.setState({ showForm: false }, () => {
            this.form = null;
        });
    };

    showForm = telegram => {
        console.log(`creating new form with: ${telegram}`);
        const layout = {
            layout: "vertical"
        };

        this.form = (
            <Form
                {...layout}
                name="basic"
                initialValues={{
                    telegramBotToken: telegram
                }}
                onFinish={this.onFinish}
                onFinishFailed={this.onFinishFailed}
            >
                <Form.Item
                    label="Telegram Bot Token"
                    name="telegramBotToken"
                    rules={[
                        {
                            required: true,
                            message: "Please input your Bot Token"
                        }
                    ]}
                >
                    <Input.Password />
                </Form.Item>

                <Form.Item>
                    <Button type="primary" htmlType="submit">
                        Submit
                    </Button>
                </Form.Item>
            </Form>
        );
        this.setState({ showForm: true });
    };

    onFinish = values => {
        console.log("Success:", values);
        const config = {
            telegramBotToken: values.telegramBotToken
        };
        this.setState({
            loading: true
        });
        const { ipcRenderer } = window.require("electron");
        ipcRenderer.send(`save-config`, config);
    };

    onFinishFailed = errorInfo => {
        console.log("Failed:", errorInfo);
    };

    render() {
        return (
            <Drawer
                placement="left"
                title="Configuration"
                width={400}
                closable={true}
                onClose={this.props.onCloseConfig}
                footer={
                    <div
                        style={{
                            textAlign: "right"
                        }}
                    >
                        {!this.state.showForm ? (
                            <Button
                                onClick={() => {
                                    this.showForm(
                                        this.state.config.telegramBotToken
                                    );
                                }}
                                type="danger"
                            >
                                Edit
                            </Button>
                        ) : (
                            <Button
                                onClick={() => {
                                    this.closeForm();
                                }}
                                type="default"
                            >
                                Cancel
                            </Button>
                        )}
                    </div>
                }
                visible={this.props.visible}
            >
                {this.state.loading ? (
                    <>
                        <p>
                            <LoadingOutlined style={{ marginRight: 10 }} />{" "}
                            Loading...
                        </p>
                    </>
                ) : (
                    <>
                        {this.state.showForm ? (
                            this.form
                        ) : (
                            <>
                                <p>
                                    {this.state.config.telegramBotTokenValid ? (
                                        <CheckCircleTwoTone
                                            twoToneColor="#52c41a"
                                            style={{ marginRight: 10 }}
                                        />
                                    ) : (
                                        <CloseCircleTwoTone
                                            twoToneColor="#eb2f96"
                                            style={{ marginRight: 10 }}
                                        />
                                    )}{" "}
                                    Telegram Bot Token
                                </p>
                            </>
                        )}
                    </>
                )}
            </Drawer>
        );
    }
}

export default Config;
