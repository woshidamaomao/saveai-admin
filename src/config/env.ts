const getApiV1BaseUrl = () => {
  const base = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? ''
  return `${base}/v1`
}

export { getApiV1BaseUrl }
