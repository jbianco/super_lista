from sqlmodel import SQLModel, Field, Relationship, JSON, Column
from typing import List, Optional
from datetime import datetime


class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(index=True, unique=True)
    hashed_password: str
    lists: List["ShoppingList"] = Relationship(back_populates="user")
    credentials: List["StoreCredential"] = Relationship(back_populates="user")


class StoreCredential(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    store_name: str
    email: str
    password: str
    user_id: int = Field(foreign_key="user.id")
    user: User = Relationship(back_populates="credentials")


class ShoppingList(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    user_id: int = Field(foreign_key="user.id")
    user: User = Relationship(back_populates="lists")
    items: List["ListItem"] = Relationship(back_populates="shopping_list")
    created_at: datetime = Field(default_factory=datetime.utcnow)


class ListItem(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    query: str
    quantity: int = Field(default=1)
    shopping_list_id: int = Field(foreign_key="shoppinglist.id")
    shopping_list: ShoppingList = Relationship(back_populates="items")


class ProductCache(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    store: str = Field(index=True)
    query: str = Field(index=True)
    products: str = Field(default="[]")
    last_updated: datetime = Field(default_factory=datetime.utcnow)
