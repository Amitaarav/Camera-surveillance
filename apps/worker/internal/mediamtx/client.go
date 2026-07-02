package mediamtx

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
)

type Client struct {
	baseURL string
	client  *http.Client
}

type addPathRequest struct {
	Source string `json:"source"`
}

func New(baseURL string) *Client {
	return &Client{
		baseURL: baseURL,
		client:  &http.Client{},
	}
}

func (c *Client) AddPath(cameraID, rtspURL string) error {
	body, err := json.Marshal(addPathRequest{
		Source: rtspURL,
	})
	if err != nil {
		return err
	}

	url := fmt.Sprintf("%s/v3/config/paths/add/%s", c.baseURL, cameraID)

	req, err := http.NewRequest(http.MethodPost, url, bytes.NewBuffer(body))
	if err != nil {
		return err
	}

	req.Header.Set("Content-Type", "application/json")

	resp, err := c.client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 300 {
		return fmt.Errorf("mediamtx returned %s", resp.Status)
	}

	return nil
}

func (c *Client) RemovePath(cameraID string) error {
	url := fmt.Sprintf("%s/v3/config/paths/remove/%s", c.baseURL, cameraID)

	req, err := http.NewRequest(http.MethodPost, url, nil)
	if err != nil {
		return err
	}

	resp, err := c.client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 300 {
		return fmt.Errorf("mediamtx returned %s", resp.Status)
	}

	return nil
}