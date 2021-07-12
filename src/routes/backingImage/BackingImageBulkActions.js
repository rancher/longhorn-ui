import React from 'react'
import PropTypes from 'prop-types'
import { Button, Modal } from 'antd'

const confirm = Modal.confirm

function bulkActions({ selectedRows, deleteBackingImages }) {
  const handleClick = (action) => {
    switch (action) {
      case 'delete':
        confirm({
          title: `Are you sure you want to delete Backing Image ${selectedRows.map(item => item.name).join(',')} ?`,
          onOk() {
            deleteBackingImages(selectedRows)
          },
        })
        break
      default:
    }
  }

  const allActions = [
    { key: 'delete', name: 'Delete', disabled() { return selectedRows.length === 0 } },
  ]

  return (
    <div>
      { allActions.map(item => {
        return (
          <div key={item.key}>
            &nbsp;
            <Button size="large" type="primary" disabled={item.disabled()} onClick={() => handleClick(item.key)}>{ item.name }</Button>
          </div>
        )
      }) }
    </div>
  )
}

bulkActions.propTypes = {
  selectedRows: PropTypes.array,
  deleteBackingImages: PropTypes.func,
}

export default bulkActions
