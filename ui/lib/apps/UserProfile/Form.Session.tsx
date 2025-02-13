import { CopyToClipboard } from 'react-copy-to-clipboard'
import {
  CheckOutlined,
  CopyOutlined,
  LogoutOutlined,
  QuestionCircleOutlined,
  ShareAltOutlined,
} from '@ant-design/icons'
import client from '@lib/client'
import {
  Alert,
  Button,
  Divider,
  Form,
  Modal,
  Select,
  Space,
  Tooltip,
} from 'antd'
import React from 'react'
import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Pre } from '@lib/components'
import { getValueFormat } from '@baurine/grafana-value-formats'
import * as auth from '@lib/utils/auth'
import ReactMarkdown from 'react-markdown'
import Checkbox from 'antd/lib/checkbox/Checkbox'
import { store } from '@lib/utils/store'

const SHARE_SESSION_EXPIRY_HOURS = [
  0.25,
  0.5,
  1,
  2,
  3,
  6,
  12,
  24,
  24 * 3,
  24 * 7,
  24 * 30,
]

function ShareSessionButton() {
  const { t } = useTranslation()
  const [visible, setVisible] = useState(false)
  const [isPosting, setIsPosting] = useState(false)
  const [code, setCode] = useState<string | undefined>(undefined)
  const [isCopied, setIsCopied] = useState(false)
  const whoAmI = store.useState((s) => s.whoAmI)

  const handleOpen = useCallback(() => {
    setVisible(true)
  }, [])

  const handleClose = useCallback(() => {
    setVisible(false)
    setCode(undefined)
    setIsPosting(false)
    setIsCopied(false)
  }, [])

  const handleFinish = useCallback(async (values) => {
    try {
      setIsPosting(true)
      const r = await client.getInstance().userShareSession({
        expire_in_sec: values.expire * 60 * 60,
        revoke_write_priv: !!values.read_only,
      })
      setCode(r.data.code)
    } finally {
      setIsPosting(false)
    }
  }, [])

  const handleCopy = useCallback(() => {
    setIsCopied(true)
  }, [])

  let button = (
    <Button onClick={handleOpen} disabled={!whoAmI || !whoAmI.is_shareable}>
      <ShareAltOutlined /> {t('user_profile.session.share')}
      {Boolean(whoAmI && !whoAmI.is_shareable) && <QuestionCircleOutlined />}
    </Button>
  )

  if (whoAmI && !whoAmI.is_shareable) {
    button = (
      <Tooltip title={t('user_profile.session.share_unavailable_tooltip')}>
        {button}
      </Tooltip>
    )
  }

  return (
    <>
      {button}
      <Modal
        closable={false}
        destroyOnClose
        footer={
          <Space>
            <CopyToClipboard text={code ?? ''} onCopy={handleCopy}>
              <Button type={isCopied ? 'default' : 'primary'}>
                {isCopied && (
                  <span>
                    <CheckOutlined />{' '}
                    {t('user_profile.share_session.success_dialog.copied')}
                  </span>
                )}
                {!isCopied && (
                  <span>
                    <CopyOutlined />{' '}
                    {t('user_profile.share_session.success_dialog.copy')}
                  </span>
                )}
              </Button>
            </CopyToClipboard>
            <Button onClick={handleClose}>
              {t('user_profile.share_session.close')}
            </Button>
          </Space>
        }
        visible={!!code}
      >
        <Alert
          message={t('user_profile.share_session.success_dialog.title')}
          description={<Pre>{code}</Pre>}
          type="success"
          showIcon
        />
      </Modal>
      <Modal
        title={t('user_profile.session.share')}
        visible={visible}
        destroyOnClose
        footer={null}
        onCancel={handleClose}
        width={600}
      >
        <ReactMarkdown>{t('user_profile.share_session.text')}</ReactMarkdown>
        <Alert
          message={t('user_profile.share_session.warning')}
          type="warning"
          showIcon
        />
        <Divider />
        <Form
          layout="vertical"
          initialValues={{ expire: 3, read_only: true }}
          onFinish={handleFinish}
        >
          <Form.Item
            name="expire"
            label={t('user_profile.share_session.form.expire')}
            rules={[{ required: true }]}
          >
            <Select style={{ width: 120 }}>
              {SHARE_SESSION_EXPIRY_HOURS.map((val) => (
                <Select.Option key={val} value={val}>
                  {getValueFormat('m')(val * 60, 0)}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="read_only"
            label={t('user_profile.share_session.form.read_only')}
            valuePropName="checked"
          >
            <Checkbox />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={isPosting}>
                {t('user_profile.share_session.form.submit')}
              </Button>
              <Button onClick={handleClose}>
                {t('user_profile.share_session.close')}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}

export function SessionForm() {
  const { t } = useTranslation()

  const handleLogout = useCallback(async () => {
    let signOutURL: string | undefined = undefined
    try {
      const resp = await client
        .getInstance()
        .userGetSignOutInfo(
          `${window.location.protocol}//${window.location.host}${window.location.pathname}`
        )
      signOutURL = resp.data.end_session_url
    } catch (e) {
      console.error(e)
    }

    auth.clearAuthToken()
    if (signOutURL) {
      window.location.href = signOutURL
    } else {
      window.location.reload()
    }
  }, [])

  return (
    <Space>
      <ShareSessionButton />
      <Button danger onClick={handleLogout}>
        <LogoutOutlined /> {t('user_profile.session.sign_out')}
      </Button>
    </Space>
  )
}
