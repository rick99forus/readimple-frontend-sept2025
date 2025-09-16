import React from "react";

export default function AuthorBooksModal({
    isOpen,
    onClose,
    author,
    books = [],
    onBookClick,
}) {
    if (!isOpen) return null;
    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
            role="dialog"
            aria-modal="true"
            aria-labelledby="author-books-title"
        >
            <div className="bg-white rounded-lg shadow-lg max-w-3xl w-full max-h-[80vh] overflow-y-auto">
                <div className="flex justify-between items-center p-4 border-b">
                    <h2 id="author-books-title" className="text-lg font-bold">
                        Books by {author}
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700"
                        aria-label="Close modal"
                    >
                        &times;
                    </button>
                </div>
                <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {books.length === 0 && (
                        <p className="text-gray-500">No books found for this author.</p>
                    )}
                    {books.map((book) => (
                        <div
                            key={book.id}
                            className="cursor-pointer"
                            onClick={() => onBookClick(book)}
                            tabIndex={0}
                            role="button"
                            onKeyPress={(e) => {
                                if (e.key === 'Enter') onBookClick(book);
                            }}
                        >
                            {book.coverImage ? (
                                <img
                                    src={book.coverImage}
                                    alt={`Cover of ${book.title}`}
                                    className="w-full h-auto rounded shadow-sm hover:shadow-md transition-shadow"
                                />
                            ) : (
                                <div className="w-full h-48 bg-gray-200 flex items-center justify-center rounded">
                                    <span className="text-gray-500 text-sm">No Image</span>
                                </div>
                            )}
                            <p className="mt-2 text-sm font-medium text-gray-900">{book.title}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}