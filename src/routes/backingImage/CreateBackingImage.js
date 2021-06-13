import React from 'react'
import PropTypes from 'prop-types'
import { Form, Input, Select, Upload, Button, Icon } from 'antd'
import { ModalBlur } from '../../components'
const FormItem = Form.Item
const Option = Select.Option

const formItemLayout = {
  labelCol: {
    span: 4,
  },
  wrapperCol: {
    span: 17,
  },
}

const modal = ({
  item,
  visible,
  onCancel,
  onOk,
  form: {
    getFieldDecorator,
    validateFields,
    getFieldsValue,
    setFieldsValue,
  },
}) => {
  function handleOk() {
    validateFields((errors) => {
      if (errors) {
        return
      }
      const requireUpload = getFieldsValue().requireUpload === 'true'
      const data = {
        ...getFieldsValue(),
        requireUpload,
      }
      onOk(data)
    })
  }

  const modalOpts = {
    title: 'Create Backing Image',
    visible,
    onCancel,
    width: 1040,
    onOk: handleOk,
  }

  const selectChange = (value) => {
    if (value === 'false') {
      setFieldsValue({
        imageURL: '',
      })
    } else {
      setFieldsValue({
        fileContainer: null,
      })
    }
  }

  const uploadProps = {
    showUploadList: false,
  }

  let disabled = getFieldsValue().requireUpload === 'true'

  return (
    <ModalBlur {...modalOpts}>
      <Form layout="horizontal">
        <FormItem label="Name" hasFeedback {...formItemLayout}>
          {getFieldDecorator('name', {
            initialValue: item.name,
            rules: [
              {
                required: true,
                message: 'Please input backing image name',
              },
            ],
          })(<Input />)}
        </FormItem>
        <FormItem label="From" {...formItemLayout}>
          {getFieldDecorator('requireUpload', {
            valuePropName: 'requireUpload',
            initialValue: 'false',
            rules: [
              {
                required: false,
              },
            ],
          })(<Select defaultValue={'false'} onChange={selectChange}>
            <Option value={'true'}>Upload From Local</Option>
            <Option value={'false'}>Download From URL</Option>
          </Select>)}
        </FormItem>
        <FormItem label="URL" {...formItemLayout} style={{ display: disabled ? 'none' : 'block' }}>
          {getFieldDecorator('imageURL', {
            initialValue: item.imageURL,
            rules: [
              {
                required: false,
                message: 'Please input backing image url',
              },
            ],
          })(<Input disabled={disabled} />)}
        </FormItem>
        <FormItem label="File" {...formItemLayout} style={{ display: disabled ? 'block' : 'none' }}>
          {getFieldDecorator('fileContainer', {
            valuePropName: 'fileContainer',
            initialValue: null,
            rules: [
              {
                required: disabled,
                message: 'Please upload backing image file',
              },
              {
                validator: (rule, value, callback) => {
                  if (disabled) {
                    let size = 0
                    if (value && value.file && value.file.originFileObj) {
                      size = value.file.originFileObj.size
                    }
                    if (size % 512 === 0) {
                      callback()
                    } else {
                      callback('Must be a multiple of 512 bytes')
                    }
                  } else {
                    callback()
                  }
                },
              },
            ],
          })(<Upload {...uploadProps}>
            <Button disabled={!disabled}>
              <Icon type="upload" /> Upload
            </Button>
          </Upload>)}
          <span style={{ marginLeft: 10 }}>{ getFieldsValue().fileContainer && getFieldsValue().fileContainer.file ? getFieldsValue().fileContainer.file.name : ''}</span>
        </FormItem>
      </Form>
    </ModalBlur>
  )
}

modal.propTypes = {
  form: PropTypes.object.isRequired,
  visible: PropTypes.bool,
  onCancel: PropTypes.func,
  item: PropTypes.object,
  onOk: PropTypes.func,
}

export default Form.create()(modal)
