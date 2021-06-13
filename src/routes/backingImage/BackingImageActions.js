import React from 'react'
import PropTypes from 'prop-types'
import { Modal, Dropdown, Button, Icon, Menu, Upload } from 'antd'
const confirm = Modal.confirm

function actions({ selected, deleteBackingImage, uploadProps }) {
  const handleMenuClick = (event, record) => {
    switch (event.key) {
      case 'delete':
        confirm({
          title: `Are you sure you want to delete backing image ${record.name} ?`,
          onOk() {
            deleteBackingImage(record)
          },
        })
        break
      default:
    }
  }

  const menu = [
    <Menu.Item key={'delete'} disabled={false}>
      <div>{ 'Delete' }</div>
    </Menu.Item>,
  ]

  if (!uploadProps.hideUpload) {
    menu.push(<Menu.Item key={'upload'} disabled={uploadProps.uploadDisabled}>
      {uploadProps.uploadDisabled ? <div>{ 'Retry Upload' }</div> : <Upload {...uploadProps}>
        <div>{ 'Retry Upload' }</div>
      </Upload>}
    </Menu.Item>)
  }

  return (
    <Dropdown
      overlay={<Menu onClick={(e) => handleMenuClick(e, selected)}>{menu}</Menu>}
    >
      <Button style={{ border: 'none' }}>
        <Icon style={{ marginRight: 2 }} type="bars" />
        <Icon type="down" />
      </Button>
    </Dropdown>
  )
}

actions.propTypes = {
  selected: PropTypes.object,
  uploadProps: PropTypes.object,
  deleteBackingImage: PropTypes.func,
}

export default actions
