package redis

import (
	"context"
	"encoding/json"
	"fmt"
	"log"

	"github.com/go-redis/redis/v8"
	"github.com/jms-uts/backend/gateway/config"
	"github.com/jms-uts/backend/gateway/internal/domain"
)

type EventPublisher struct {
	client *redis.Client
	queue  string
}

func NewEventPublisher(cfg *config.RedisConfig) (*EventPublisher, error) {
	client := redis.NewClient(&redis.Options{
		Addr:     cfg.Addr(),
		Password: cfg.Password,
		DB:       cfg.DB,
	})

	ctx := context.Background()
	if err := client.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("failed to connect to Redis: %w", err)
	}

	log.Println("[Redis] Successfully connected to Redis at", cfg.Addr())
	return &EventPublisher{
		client: client,
		queue:  cfg.AuditQueue,
	}, nil
}

func (p *EventPublisher) PublishAuditJob(ctx context.Context, payload domain.AuditEventPayload) error {
	data, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to serialize event payload: %w", err)
	}

	if err := p.client.LPush(ctx, p.queue, data).Err(); err != nil {
		return fmt.Errorf("failed to LPUSH to %s: %w", p.queue, err)
	}

	log.Printf("[Redis] Successfully enqueued audit job: audit_id=%s, file_id=%s to queue=%s\n",
		payload.AuditID, payload.FileID, p.queue)
	return nil
}

