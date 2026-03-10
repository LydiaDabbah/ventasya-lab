export default function ProductsSection() {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-black mb-2">Products</h1>
            <p className="text-gray-600 text-sm sm:text-base">Manage your product catalog.</p>
          </div>
          <button className="bg-black text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors text-sm sm:text-base">
            Add Product
          </button>
        </div>
  
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row gap-4">
              <input
                type="text"
                placeholder="Search products..."
                className="flex-1 px-3 sm:px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-sm"
              />
              <select className="px-3 sm:px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-sm">
                <option>All Categories</option>
                <option>Tables</option>
                <option>Chairs</option>
                <option>Sofas</option>
              </select>
            </div>
          </div>
  
          {/* Mobile Cards View */}
          <div className="sm:hidden">
            <div className="divide-y divide-gray-200">
              <div className="p-4 hover:bg-gray-50">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gray-200 rounded-lg flex-shrink-0"></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-black truncate">Lisabo Dining Table</p>
                      <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                        Active
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">Tables • $299.00 • Stock: 12</p>
                    <div className="flex space-x-3 mt-2">
                      <button className="text-sm text-black hover:text-gray-600 transition-colors">Edit</button>
                      <button className="text-sm text-red-600 hover:text-red-800 transition-colors">Delete</button>
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-4 hover:bg-gray-50">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gray-200 rounded-lg flex-shrink-0"></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-black truncate">Indoor Lounge Chair</p>
                      <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                        Active
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">Chairs • $79.00 • Stock: 8</p>
                    <div className="flex space-x-3 mt-2">
                      <button className="text-sm text-black hover:text-gray-600 transition-colors">Edit</button>
                      <button className="text-sm text-red-600 hover:text-red-800 transition-colors">Delete</button>
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-4 hover:bg-gray-50">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gray-200 rounded-lg flex-shrink-0"></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-black truncate">Fleur Modern Sofa</p>
                      <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                        Low Stock
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">Sofas • $149.00 • Stock: 3</p>
                    <div className="flex space-x-3 mt-2">
                      <button className="text-sm text-black hover:text-gray-600 transition-colors">Edit</button>
                      <button className="text-sm text-red-600 hover:text-red-800 transition-colors">Delete</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
  
          {/* Desktop Table View */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stock
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                <tr className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-gray-200 rounded-lg mr-3"></div>
                      <div className="text-sm font-medium text-black">Lisabo Dining Table</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">Tables</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-black">$299.00</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">12</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                      Active
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button className="text-black hover:text-gray-600 transition-colors mr-3">Edit</button>
                    <button className="text-red-600 hover:text-red-800 transition-colors">Delete</button>
                  </td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-gray-200 rounded-lg mr-3"></div>
                      <div className="text-sm font-medium text-black">Indoor Lounge Chair</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">Chairs</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-black">$79.00</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">8</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                      Active
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button className="text-black hover:text-gray-600 transition-colors mr-3">Edit</button>
                    <button className="text-red-600 hover:text-red-800 transition-colors">Delete</button>
                  </td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-gray-200 rounded-lg mr-3"></div>
                      <div className="text-sm font-medium text-black">Fleur Modern Sofa</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">Sofas</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-black">$149.00</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">3</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                      Low Stock
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button className="text-black hover:text-gray-600 transition-colors mr-3">Edit</button>
                    <button className="text-red-600 hover:text-red-800 transition-colors">Delete</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )
  }
  