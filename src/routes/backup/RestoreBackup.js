import React from 'react'
import PropTypes from 'prop-types'
import { Form, Input, InputNumber, Checkbox, Spin, Select } from 'antd'
import { ModalBlur } from '../../components'
const FormItem = Form.Item
const Option = Select.Option

const formItemLayout = {
  labelCol: {
    span: 7,
  },
  wrapperCol: {
    span: 15,
  },
}

const modal = ({
  item,
  visible,
  onCancel,
  onOk,
  previousChecked,
  nodeTags,
  diskTags,
  tagsLoading,
  backingImages,
  setPreviousChange,
  isBulk = false,
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
      const data = {
        ...getFieldsValue(),
        fromBackup: item.fromBackup,
      }
      if (data.name && typeof data.name === 'string') {
        data.name = data.name.trimLeftAndRight()
      }
      onOk(data)
    })
  }
  const modalOpts = {
    title: isBulk ? 'Restore Backup' : `Restore Backup ${item.backupName}`,
    visible,
    onCancel,
    onOk: handleOk,
    width: 600,
  }

  function onPreviousChange(value) {
    if (item.volumeName) {
      value.target.checked ? setFieldsValue({ name: item.volumeName }) : setFieldsValue({ name: '' })
    }
    setPreviousChange(value.target.checked)
  }

  return (
    <ModalBlur {...modalOpts}>
      <Form layout="horizontal">
        <FormItem label="Name" hasFeedback {...formItemLayout}>
          {getFieldDecorator('name', {
            initialValue: item.name,
            rules: [
              {
                required: true && !isBulk,
                message: 'Please input volume name',
              },
            ],
          })(<Input disabled={isBulk} />)}
        </FormItem>
          {!isBulk ? <FormItem label="Use Previous Name" hasFeedback {...formItemLayout}>
              <Checkbox checked={previousChecked} disabled={!item.volumeName} onChange={onPreviousChange}></Checkbox>
            </FormItem> : ''}
          {!isBulk ? <FormItem label="Number of Replicas" hasFeedback {...formItemLayout}>
            {getFieldDecorator('numberOfReplicas', {
              initialValue: item.numberOfReplicas,
              rules: [
                {
                  required: true,
                  message: 'Please input the number of replicas',
                },
              ],
            })(<InputNumber min={1} />)}
          </FormItem> : <FormItem label="Number of Replicas" hasFeedback {...formItemLayout}>
            {getFieldDecorator('numberOfReplicas', {
              initialValue: item.numberOfReplicas,
              rules: [
                {
                  required: true,
                  message: 'Please input the number of replicas',
                },
              ],
            })(<InputNumber min={1} />)}
          </FormItem>}
        <FormItem label="Access Mode" hasFeedback {...formItemLayout}>
          {getFieldDecorator('accessMode', {
            initialValue: item.accessMode,
          })(<Select>
            <Option key={'ReadWriteOnce'} value={'rwo'}>ReadWriteOnce</Option>
            <Option key={'ReadWriteMany'} value={'rwx'}>ReadWriteMany</Option>
          </Select>)}
        </FormItem>
        <FormItem label="Backing Image" hasFeedback {...formItemLayout}>
          {getFieldDecorator('backingImage', {
            initialValue: item.backingImage,
          })(<Select allowClear={true}>
            { backingImages.map(backingImage => <Option key={backingImage.name} value={backingImage.name}>{backingImage.name}</Option>) }
          </Select>)}
        </FormItem>
        <Spin spinning={tagsLoading}>
          <FormItem label="Node Tag" hasFeedback {...formItemLayout}>
            {getFieldDecorator('nodeSelector', {
              initialValue: [],
            })(<Select mode="tags">
            { nodeTags.map(opt => <Option key={opt.id} value={opt.id}>{opt.name}</Option>) }
            </Select>)}
          </FormItem>
        </Spin>
        <Spin spinning={tagsLoading}>
          <FormItem label="Disk Tag" hasFeedback {...formItemLayout}>
            {getFieldDecorator('diskSelector', {
              initialValue: [],
            })(<Select mode="tags">
            { diskTags.map(opt => <Option key={opt.id} value={opt.id}>{opt.name}</Option>) }
            </Select>)}
          </FormItem>
        </Spin>
      </Form>
    </ModalBlur>
  )
}

modal.propTypes = {
  form: PropTypes.object.isRequired,
  visible: PropTypes.bool,
  previousChecked: PropTypes.bool,
  onCancel: PropTypes.func,
  item: PropTypes.object,
  onOk: PropTypes.func,
  setPreviousChange: PropTypes.func,
  hosts: PropTypes.array,
  nodeTags: PropTypes.array,
  diskTags: PropTypes.array,
  backingImages: PropTypes.array,
  isBulk: PropTypes.bool,
  tagsLoading: PropTypes.bool,
}

export default Form.create()(modal)
