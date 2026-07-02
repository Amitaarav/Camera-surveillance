package redis

import (
	"context"
	"time"

	goredis "github.com/redis/go-redis/v9"
)

type Consumer struct {
	client *goredis.Client
}

func New(client *goredis.Client) *Consumer {
	return &Consumer{
		client: client,
	}

}

func (c *Consumer) Read(
	ctx context.Context,
	group string,
	consumer string,
	stream string,
) ([]goredis.XStream, error) {

	return c.client.XReadGroup(ctx, &goredis.XReadGroupArgs{
		Group:    group,
		Consumer: consumer,
		Streams:  []string{stream, ">"},
		Count:    1,
		Block:    2 * time.Second,
	}).Result()
}

func (c *Consumer) Ack(
	ctx context.Context,
	stream,
	group,
	id string,
) error {

	return c.client.XAck(
		ctx,
		stream,
		group,
		id,
	).Err()
}