import React from 'react';
import { Form, Input, Button, Drawer } from 'antd';
import { LoadingOutlined, CheckCircleTwoTone, CloseCircleTwoTone } from '@ant-design/icons';

class YoutubeSearch extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            loading: false,
            query: null
        };
    }

    componentDidMount() {}

    onFinish = values => {
        console.log('Success:', values);
    };

    onFinishFailed = errorInfo => {
        console.log('Failed:', errorInfo);
    };

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
                <Input placeholder="Type Something..."/>
            </Drawer>
        );
    }
}

export default YoutubeSearch;
