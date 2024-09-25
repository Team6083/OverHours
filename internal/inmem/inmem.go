package inmem

import (
	"sync"

	"github.com/Team6083/OverHours/internal/errors"
)

type Repository struct {
	mtx   sync.RWMutex
	store map[string]interface{}
}

func NewInMemRepository() *Repository {
	return &Repository{
		store: make(map[string]interface{}),
	}
}

func (r *Repository) Store(id string, e interface{}) error {
	r.mtx.Lock()
	defer r.mtx.Unlock()

	r.store[id] = e
	return nil
}

func (r *Repository) Find(id string) (interface{}, error) {
	r.mtx.RLock()
	defer r.mtx.RUnlock()

	res, ok := r.store[id]
	if !ok {
		return nil, errors.ErrNotFound
	}

	return res, nil
}

func (r *Repository) FindAll(filterFunc func(e interface{}) bool) ([]interface{}, error) {
	r.mtx.RLock()
	defer r.mtx.RUnlock()

	result := make([]interface{}, 0)
	for _, v := range r.store {
		if filterFunc(v) {
			result = append(result, v)
		}
	}

	return result, nil
}
